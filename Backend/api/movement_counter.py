import numpy as np

class MovementCounter:
    def __init__(self):
        self.state = "down"  # Start with arms down
        self.count = 0
        self.last_shoulder_y = None
        self.last_elbow_y = None
        self.frame_count = 0
        self.last_state_change = 0

    def update(self, keypoints):
        try:
            self.frame_count += 1
            
            # Keypoint indices for COCO format:
            # 5: left_shoulder, 6: right_shoulder
            # 7: left_elbow, 8: right_elbow
            # 9: left_wrist, 10: right_wrist
            
            left_shoulder = keypoints[5]
            right_shoulder = keypoints[6]
            left_elbow = keypoints[7]
            right_elbow = keypoints[8]
            left_wrist = keypoints[9]
            right_wrist = keypoints[10]
            
            # Check if keypoints are valid (not zero coordinates)
            if (left_shoulder[0] == 0 and left_shoulder[1] == 0) or \
               (right_shoulder[0] == 0 and right_shoulder[1] == 0) or \
               (left_elbow[0] == 0 and left_elbow[1] == 0) or \
               (right_elbow[0] == 0 and right_elbow[1] == 0):
                print("Invalid keypoints detected")
                return self.count
            
            # Calculate average shoulder and elbow positions
            avg_shoulder_y = (left_shoulder[1] + right_shoulder[1]) / 2
            avg_elbow_y = (left_elbow[1] + right_elbow[1]) / 2
            
            # Calculate the vertical movement of arms
            # When arms are up: elbow_y < shoulder_y (smaller y value = higher position)
            # When arms are down: elbow_y > shoulder_y (larger y value = lower position)
            
            arm_position = avg_elbow_y - avg_shoulder_y
            
            # Print debug info every 30 frames (about once per second)
            if self.frame_count % 30 == 0:
                print(f"Frame {self.frame_count}: Shoulder Y: {avg_shoulder_y:.1f}, Elbow Y: {avg_elbow_y:.1f}, Position: {arm_position:.1f}, State: {self.state}")
            
            # Adjust thresholds - make them more lenient
            up_threshold = -15  # Arms are up when elbow is above shoulder
            down_threshold = 0   # Arms are down when elbow is at or below shoulder
            
            # Add minimum frames between state changes to avoid rapid switching
            min_frames_between_changes = 10
            
            if arm_position < up_threshold and self.state == "down" and (self.frame_count - self.last_state_change) > min_frames_between_changes:
                # Arms moved up
                self.state = "up"
                self.last_state_change = self.frame_count
                print(f"Arms UP - Position: {arm_position:.2f} - Frame: {self.frame_count}")
            elif arm_position > down_threshold and self.state == "up" and (self.frame_count - self.last_state_change) > min_frames_between_changes:
                # Arms moved down - count one repetition
                self.count += 1
                self.state = "down"
                self.last_state_change = self.frame_count
                print(f"Arms DOWN - Count: {self.count} - Position: {arm_position:.2f} - Frame: {self.frame_count}")
            
            # Store current positions for next frame
            self.last_shoulder_y = avg_shoulder_y
            self.last_elbow_y = avg_elbow_y
            
        except Exception as e:
            print(f"Error in movement counter: {e}")
            pass
            
        return self.count
