from flask import Flask, jsonify, request
from flask_cors import CORS
import threading

from engine import process_video

app = Flask(__name__)
CORS(app)

state_lock = threading.Lock()
engine_state = {
    "is_running": False,
    "current_activity": None,
    "current_reps": 0,
    "target_reps": None,
    "target_reached": False,
    "stop_reason": None,
    "thread": None,
    "stop_event": None,
    "rep_sparc_scores": [],
    "rep_rom_scores": [],
    "repetition_times": [],
}


def _run_engine(activity, target_reps, resume_reps, duration_minutes, stop_event):
    """Worker that runs the engine loop in a background thread."""
    try:
        result = process_video(
            activity=activity,
            stop_event=stop_event,
            target_reps=target_reps,
            initial_reps=resume_reps,
            duration_minutes=duration_minutes,
        )
        rep_sparc_scores = []
        rep_rom_scores = []
        repetition_times = []
        if isinstance(result, dict):
            reps = int(result.get("repetition_count", 0) or 0)
            target_reached = bool(result.get("target_reached"))
            stop_reason = result.get("stop_reason")
            rep_sparc_scores = result.get("rep_sparc_scores", []) or []
            rep_rom_scores = result.get("rep_rom_scores", []) or []
            repetition_times = result.get("repetition_times", []) or []
        else:
            reps = int(result or 0)
            target_reached = False
            stop_reason = None
            rep_sparc_scores = []
            rep_rom_scores = []
            repetition_times = []
        with state_lock:
            engine_state["current_reps"] = reps
            engine_state["target_reached"] = target_reached
            engine_state["rep_sparc_scores"] = rep_sparc_scores
            engine_state["rep_rom_scores"] = rep_rom_scores
            engine_state["repetition_times"] = repetition_times
            if stop_reason:
                engine_state["stop_reason"] = stop_reason
    except Exception as exc:
        print(f"[Rehab Engine] Error: {exc}")
        with state_lock:
            engine_state["stop_reason"] = "error"
            engine_state["rep_sparc_scores"] = []
            engine_state["rep_rom_scores"] = []
            engine_state["repetition_times"] = []
    finally:
        with state_lock:
            engine_state["is_running"] = False
            engine_state["current_activity"] = None
            engine_state["thread"] = None
            engine_state["stop_event"] = None


@app.route("/start", methods=["POST"])
def start_recognition():
    """Start real-time recognition for a given activity."""
    payload = request.get_json(silent=True) or {}
    activity = request.args.get("activity") or payload.get("activity")
    raw_target = request.args.get("target_reps") or payload.get("target_reps")
    raw_resume_reps = request.args.get("resume_reps") or payload.get("resume_reps")
    raw_duration_minutes = request.args.get("duration_minutes") or payload.get("duration_minutes")
    target_reps = None
    resume_reps = 0
    duration_minutes = 1  # Default to 1 minute

    if raw_target is not None:
        try:
            target_candidate = int(raw_target)
            if target_candidate <= 0:
                return jsonify({"error": "target_reps must be a positive integer"}), 400
            target_reps = target_candidate
        except (TypeError, ValueError):
            return jsonify({"error": "target_reps must be a positive integer"}), 400

    if raw_resume_reps is not None:
        try:
            resume_candidate = int(raw_resume_reps)
            resume_reps = max(0, resume_candidate)
        except (TypeError, ValueError):
            resume_reps = 0

    if raw_duration_minutes is not None:
        try:
            duration_candidate = int(raw_duration_minutes)
            if duration_candidate > 0:
                duration_minutes = duration_candidate
        except (TypeError, ValueError):
            pass  # Use default

    if not activity:
        return jsonify({"error": "Missing activity parameter"}), 400

    with state_lock:
        if engine_state["is_running"]:
            return jsonify({
                "error": "Engine is already running",
                "current_activity": engine_state["current_activity"],
            }), 409

        stop_event = threading.Event()
        engine_state["is_running"] = True
        engine_state["current_activity"] = activity
        engine_state["current_reps"] = 0
        engine_state["target_reps"] = target_reps
        engine_state["target_reached"] = False
        engine_state["stop_reason"] = None
        engine_state["stop_event"] = stop_event
        engine_state["resume_reps"] = resume_reps
        engine_state["rep_sparc_scores"] = []
        engine_state["rep_rom_scores"] = []
        engine_state["repetition_times"] = []

        thread = threading.Thread(
            target=_run_engine,
            args=(activity, target_reps, resume_reps, duration_minutes, stop_event),
            daemon=True,
        )
        engine_state["thread"] = thread
        thread.start()

    return jsonify({
        "message": "Recognition started",
        "activity": activity,
        "target_reps": target_reps,
        "resume_reps": resume_reps,
        "status": "running",
    }), 200


@app.route("/stop", methods=["POST"])
def stop_recognition():
    """Stop the current recognition session."""
    with state_lock:
        if not engine_state["is_running"]:
            return jsonify({"error": "Engine is not running"}), 409

        stop_event = engine_state["stop_event"]
        thread = engine_state["thread"]

        if stop_event:
            stop_event.set()

    if thread and thread.is_alive():
        thread.join(timeout=2.0)

    with state_lock:
        engine_state["is_running"] = False
        engine_state["current_activity"] = None
        engine_state["thread"] = None
        engine_state["stop_event"] = None
        if not engine_state["stop_reason"]:
            engine_state["stop_reason"] = "manual_stop"
        engine_state["target_reached"] = engine_state["stop_reason"] == "target_reached"
        response_payload = {
            "message": "Recognition stopped",
            "final_reps": engine_state["current_reps"],
            "target_reps": engine_state["target_reps"],
            "target_reached": engine_state["target_reached"],
            "stop_reason": engine_state["stop_reason"],
            "rep_sparc_scores": engine_state.get("rep_sparc_scores", []),
            "rep_rom_scores": engine_state.get("rep_rom_scores", []),
            "repetition_times": engine_state.get("repetition_times", []),
        }

    return jsonify(response_payload), 200


@app.route("/status", methods=["GET"])
def get_status():
    """Return current engine status."""
    with state_lock:
        return jsonify({
            "is_running": engine_state["is_running"],
            "current_activity": engine_state["current_activity"],
            "current_reps": engine_state["current_reps"],
            "target_reps": engine_state["target_reps"],
            "target_reached": engine_state["target_reached"],
            "stop_reason": engine_state["stop_reason"],
            "rep_sparc_scores": engine_state.get("rep_sparc_scores", []),
            "rep_rom_scores": engine_state.get("rep_rom_scores", []),
            "repetition_times": engine_state.get("repetition_times", []),
        }), 200


@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    print("🚀 Starting Rehab Engine API on http://localhost:8808")
    app.run(host="0.0.0.0", port=8808, debug=True, threaded=True)


