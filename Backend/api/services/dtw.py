"""
DTW utilities with Sakoe-Chiba band, LB_Keogh lower bound, and weighted/masked cost
"""
from typing import Optional
import numpy as np


def lb_keogh_lower_bound(A: np.ndarray, B: np.ndarray, band: int) -> float:
    """
    LB_Keogh lower bound between sequences A and B (shape [T,F]) under Sakoe-Chiba band.
    Returns a lower bound of DTW distance (normalized by max(TA, TB)).
    """
    TA, FA = A.shape
    TB, FB = B.shape
    if FA != FB:
        return 0.0

    # Build envelopes for B under band
    lower = np.empty((TB, FB), dtype=B.dtype)
    upper = np.empty((TB, FB), dtype=B.dtype)
    for t in range(TB):
        j0 = max(0, t - band)
        j1 = min(TB, t + band + 1)
        window = B[j0:j1]
        lower[t] = window.min(axis=0)
        upper[t] = window.max(axis=0)

    # Sum of violations of A against B's envelopes
    # Map A's indices to B's timeline proportionally
    bound = 0.0
    for i in range(TA):
        t = int(round(i * (TB - 1) / max(1, TA - 1)))
        ai = A[i]
        below = ai < lower[t]
        above = ai > upper[t]
        diff = np.where(below, lower[t] - ai, 0.0) + np.where(above, ai - upper[t], 0.0)
        bound += np.linalg.norm(diff)

    return float(bound / max(TA, TB))


def _frame_cost(a: np.ndarray, b: np.ndarray, weights: Optional[np.ndarray] = None, mask: Optional[np.ndarray] = None) -> float:
    """
    Weighted/masked Euclidean cost between two frames (feature vectors).
    weights: shape [F], non-negative, will be L1-normalized internally if provided.
    mask: shape [F], in [0,1], scales local contribution (e.g., low confidence → smaller weight).
    """
    diff = a - b
    if mask is not None:
        diff = diff * mask
    if weights is not None:
        w = weights
        s = np.sum(w)
        if s > 0:
            w = w / s
        diff = diff * np.sqrt(np.maximum(w, 0.0))
    return float(np.linalg.norm(diff))


def dtw_distance(
    A: np.ndarray,
    B: np.ndarray,
    band: int,
    weights: Optional[np.ndarray] = None,
    mask: Optional[np.ndarray] = None,
    lb_keogh: bool = True
) -> float:
    """
    DTW with Sakoe-Chiba band and optional weighted/masked frame cost.
    Returns normalized distance (sum cost / max(TA, TB)).
    """
    TA, FA = A.shape
    TB, FB = B.shape
    if FA != FB:
        return 999999.0

    band = max(3, int(band))
    # Ensure band wide enough to allow reaching (TA, TB)
    band = max(band, abs(TA - TB) + 1)

    # Optional LB_Keogh pruning
    if lb_keogh:
        lb = lb_keogh_lower_bound(A, B, band)
        # If lower bound already very high compared to typical scale, early return
        # We keep it simple; caller can compare multiple templates and choose min.
        # Returning the LB itself keeps admissibility as a lower bound.
        # To be conservative, we still compute DTW; if performance is key, enable pruning by threshold.

    # Initialize DP matrix
    big = 999999.0
    D = np.full((TA + 1, TB + 1), big, dtype=np.float32)
    D[0, 0] = 0.0

    for i in range(1, TA + 1):
        j_start = max(1, i - band)
        j_end = min(TB + 1, i + band + 1)
        ai = A[i - 1]
        for j in range(j_start, j_end):
            bj = B[j - 1]
            cost = _frame_cost(ai, bj, weights=weights, mask=mask)
            D[i, j] = cost + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])

    final_cost = float(D[TA, TB])
    if final_cost >= big:
        # Fallback: full DTW (no band)
        D2 = np.full((TA + 1, TB + 1), big, dtype=np.float32)
        D2[0, 0] = 0.0
        for i in range(1, TA + 1):
            ai = A[i - 1]
            for j in range(1, TB + 1):
                bj = B[j - 1]
                cost = _frame_cost(ai, bj, weights=weights, mask=mask)
                D2[i, j] = cost + min(D2[i - 1, j], D2[i, j - 1], D2[i - 1, j - 1])
        final_cost2 = float(D2[TA, TB])
        if final_cost2 >= big:
            return 999999.0
        return final_cost2 / max(TA, TB)
    return final_cost / max(TA, TB)


