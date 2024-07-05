import * as posedetection from '@tensorflow-models/pose-detection';
import State from './state';
import Sound from './sound';
import Camera from './camera';
import Game from './headToWin';


export class RendererCanvas2d {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.videoWidth = canvas.width;
    this.videoHeight = canvas.height;
    this.lastPoseValidValue = false;
    this.modelType = posedetection.SupportedModels.BlazePose;
    this.scoreThreshold = 0.75;
    this.triggerAudio = false;
    this.headKeypoints = ['nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer', 'left_ear', 'right_ear'];
    this.topmostPoint = null;
    this.headCircle = null;
  }

  draw(rendererParams) {
    const [video, poses, isModelChanged, bodySegmentationCanvas] = rendererParams;
    this.videoWidth = video.width;
    this.videoHeight = video.height;
    this.ctx.canvas.width = this.videoWidth;
    this.ctx.canvas.height = this.videoHeight;

    this.lineHeight = this.videoHeight / 2.5;
    /*this.redBoxX = this.videoWidth / 3;
    this.redBoxY = this.videoHeight / 5 * 1;
    this.redBoxWidth = this.videoWidth / 3;
    this.redBoxHeight = this.videoHeight / 5 * 4;*/

    this.drawCtx(video, bodySegmentationCanvas);
    if (['prepare', 'counting3', 'counting2', 'counting1', 'counting0', 'playing', 'outBox'].includes(State.state)) {
      let isCurPoseValid = false;
      if (poses && poses.length > 0 && !isModelChanged) {
        this.drawResults(poses, video.width / video.videoWidth);
        //this.isPoseValid(poses, video.width / video.videoWidth);
        isCurPoseValid = this.isPoseValid(poses, video.width / video.videoWidth);
        if (isCurPoseValid && State.bodyInsideRedBox.value == true) {
          if (State.state == 'prepare' && State.getStateLastFor() > 3500) {
            State.changeState('counting3');
          } else if (State.state == 'counting3' && State.getStateLastFor() > 1000) {
            State.changeState('counting2');
          } else if (State.state == 'counting2' && State.getStateLastFor() > 1000) {
            State.changeState('counting1');
          } else if (State.state == 'counting1' && State.getStateLastFor() > 1000) {
            State.changeState('counting0');
          } else if (State.state == 'counting0' && State.getStateLastFor() > 1000) {
            State.changeState('playing', 'showStage');
          } else if (State.state == 'playing') {

            if (State.stageType == 'showStage' && State.getStateLastFor() > 1000) {
              //State.changeState('playing', 'showQstImg');
            } else if (State.stateType == 'waitAns') {
              if (State.selectedImg.value && State.selectedImg.lastFor > 1000) {
                //1秒掂到就得，唔駛倒數
                //State.changeState('playing', Game.checkAnswer() ? 'ansCorrect' : 'ansWrong');
                //State.changeState('playing', 'touched1');
              }
            } else if (State.stateType == 'touched1') {
              if (State.selectedImg.value && State.selectedImg.lastFor > 2000) {
                State.changeState('playing', 'touched2');
              } else if (!State.selectedImg.value) {
                State.changeState('playing', 'waitAns');
              }
            } else if (State.stateType == 'touched2') {
              if (State.selectedImg.value && State.selectedImg.lastFor > 3000) {
                //let isCorrect = Game.checkAnswer();
                // State.changeState('playing', isCorrect ? 'ansCorrect' : 'ansWrong');
              } else if (!State.selectedImg.value) {
                State.changeState('playing', 'waitAns');
              }
            }
          } else if (State.state == 'outBox' && State.bodyInsideRedBox.lastFor > 2000) {
            State.changeState('playing', 'waitAns');
          }
        }
      }
      this.drawHorizontalLine(isCurPoseValid);
    }
  }

  checkCircleRectIntersection(
    circleX, circleY, circleRadius,
    rectLeft, rectTop, rectRight, rectBottom
  ) {
    // Calculate the distance between the circle center and the closest point on the rectangle
    let distanceX = Math.max(rectLeft - circleX, 0, circleX - rectRight);
    let distanceY = Math.max(rectTop - circleY, 0, circleY - rectBottom);

    // Check if the distance is less than the circle radius
    let distanceSquared = distanceX * distanceX + distanceY * distanceY;
    return distanceSquared <= (circleRadius * circleRadius);
  }

  isPoseValid(poses) {
    if (!poses[0]) return false;
    let pose = poses[0];
    //let passScore = this.scoreThreshold;
    let isBodyOutBox;

    if (pose.keypoints != null) {
      //nose, left_eye_inner, left_eye, left_eye_outer, right_eye_inner, right_eye, right_eye_outer, left_ear, right_ear, mouth_left, mouth_right, left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_pinky, right_pinky, left_index, right_index, left_thumb, right_thumb, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle, left_heel, right_heel, left_foot_index, right_foot_index
      //let checkKeypoints = pose.keypoints.filter(k=>['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee'].includes(k.name) && k.score>0.65);
      //let checkKeypoints = pose.keypoints.filter(k => k.name == 'nose' && k.score > passScore);
      if (this.topmostPoint) {
        isBodyOutBox = this.topmostPoint.y < this.lineHeight ? true : false
      }
      else {
        isBodyOutBox = false;
      }

      State.setPoseState('bodyInsideRedBox', !isBodyOutBox);
      if (isBodyOutBox) {
        if (State.state == 'playing') State.changeState('outBox', 'outBox');
        //console.log('outBox', 'outBox');
        return false;
      }

      let questionBoard = null;

      if (Game.randomQuestion) {
        if (Game.randomQuestion.type === 'Listening') {
          questionBoard = document.querySelector('.questionAudioBg');
        }
        else if (Game.randomQuestion.type === 'FillingBlank') {
          questionBoard = document.querySelector('.questionImgBg');
        }
      }

      //let resetBtn = document.querySelector('.resetBtn');

      //檢查是否有選到圖
      let optionWrappers = document.querySelectorAll('.canvasWrapper > .optionArea > .optionWrapper.show');
      let canvasWrapper = document.querySelector('.canvasWrapper');
      if (State.state == 'playing' && ['waitAns'].includes(State.stateType)) {

        let touchingWord = [];
        if (this.headCircle) {
          const canvasWrapperRect = canvasWrapper.getBoundingClientRect();
          //console.log(this.headCircle);
          for (let option of optionWrappers) {
            const optionRect = option.getBoundingClientRect();
            if (
              (this.topmostPoint.x + this.topmostPoint.radius) > (optionRect.left - canvasWrapperRect.left) &&
              (this.topmostPoint.x - this.topmostPoint.radius) < (optionRect.right - canvasWrapperRect.left) &&
              this.topmostPoint.y > (optionRect.top - canvasWrapperRect.top) &&
              this.topmostPoint.y < (optionRect.bottom - canvasWrapperRect.top)
            ) {
              touchingWord.push(option);
            }
          }
        }

        for (let option of optionWrappers) {
          if (touchingWord.includes(option) && !option.classList.contains('touch')) {
            State.setPoseState('selectedImg', option);
            //console.log("touch ", option);
            Game.fillWord(option, this.topmostPoint);
          }
        }

        if (touchingWord.length === 0) State.setPoseState('selectedImg', '');
      }
      else if (State.state == 'playing' && ['wrong'].includes(State.stateType)) {
        for (let option of optionWrappers) option.classList.remove('touch');
        State.changeState('playing', 'waitAns');
      }

      return true;
    } else {
      return false;
    }
  }

  /*drawBox(isCurPoseValid) {
    //this.ctx.translate(this.videoWidth, 0);
    //this.ctx.scale(-1, 1);
    this.ctx.beginPath();
    this.ctx.lineWidth = isCurPoseValid ? 1 : Math.max(10, this.videoHeight * 0.01);//20230821老師話想轉1px白色  Math.max(10, this.videoHeight * 0.01);
    //this.ctx.roundRect(this.redBoxX, this.redBoxY, this.redBoxWidth, this.redBoxHeight, [this.videoHeight * 0.02]);
    this.ctx.rect(this.redBoxX, this.redBoxY, this.redBoxWidth, this.redBoxHeight);
    this.ctx.strokeStyle = isCurPoseValid ? '#FFFFFF' : '#ff0000';//20230821老師話想轉1px白色  isCurPoseValid ? '#00ff00' : '#ff0000';
    this.ctx.stroke();
    if (!this.lastPoseValidValue && isCurPoseValid && State.isSoundOn) Sound.play('poseValid');
    this.lastPoseValidValue = isCurPoseValid;
  }*/

  drawHorizontalLine(isCurPoseValid) {
    const centerY = this.lineHeight; // Calculate the vertical center of the screen
    const startX = 0; // Start of the line (left edge)
    const endX = this.videoWidth; // End of the line (right edge)

    this.ctx.beginPath();
    this.ctx.lineWidth = isCurPoseValid ? 1 : Math.max(10, this.videoHeight * 0.01);
    this.ctx.moveTo(startX, centerY); // Move to the start of the line
    this.ctx.lineTo(endX, centerY); // Draw the line to the end point
    this.ctx.strokeStyle = isCurPoseValid ? '#FFFFFF' : '#ff0000';
    this.ctx.stroke();

    if (!this.lastPoseValidValue && isCurPoseValid && State.isSoundOn) {
      Sound.play('poseValid');
    }
    this.lastPoseValidValue = isCurPoseValid;
  }

  drawCtx(video, bodySegmentationCanvas) {
    if (Camera.constraints.video.facingMode == 'user') {
      this.ctx.translate(this.videoWidth, 0);
      this.ctx.scale(-1, 1);
    }
    this.ctx.drawImage(bodySegmentationCanvas ? bodySegmentationCanvas : video, 0, 0, this.videoWidth, this.videoHeight);
    if (Camera.constraints.video.facingMode == 'user') {
      this.ctx.translate(this.videoWidth, 0);
      this.ctx.scale(-1, 1);
    }
  }

  clearCtx() {
    this.ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);
  }

  drawResults(poses, ratio) {
    for (const pose of poses) {
      this.drawResult(pose, ratio);
    }
  }

  drawResult(pose, ratio) {
    if (pose.keypoints != null) {
      this.keypointsFitRatio(pose.keypoints, ratio);
      this.drawKeypoints(pose.keypoints);
      this.drawSkeleton(pose.keypoints, pose.id);
    }
  }

  drawKeypoints(keypoints) {
    const keypointInd = posedetection.util.getKeypointIndexBySide(this.modelType);
    this.ctx.fillStyle = 'Red';
    this.ctx.strokeStyle = 'White';
    this.ctx.lineWidth = 2;

    for (const i of keypointInd.middle) {
      this.drawKeypoint(keypoints[i]);
    }

    this.ctx.fillStyle = 'Green';
    for (const i of keypointInd.left) {
      this.drawKeypoint(keypoints[i]);
    }

    this.ctx.fillStyle = 'Orange';
    for (const i of keypointInd.right) {
      this.drawKeypoint(keypoints[i]);
    }
  }

  keypointsFitRatio(keypoints, ratio) {
    for (let keypoint of keypoints) {
      keypoint.x = (Camera.constraints.video.facingMode == 'user') ? this.videoWidth - (keypoint.x * ratio) : (keypoint.x * ratio);
      keypoint.y = keypoint.y * ratio;
    }
  }

  drawKeypoint(keypoint) {
    // If score is null, just show the keypoint.
    const score = keypoint.score != null ? keypoint.score : 1;
    //const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;

    if (score >= this.scoreThreshold && this.headKeypoints.includes(keypoint.name)) {
      const circle = new Path2D();
      circle.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
      this.ctx.fill(circle);
      this.ctx.stroke(circle);
    }
  }

  drawSkeleton(keypoints, poseId) {
    const color = 'White';
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    let leftEar = null;
    let rightEar = null;
    let offsetY = null;

    posedetection.util.getAdjacentPairs(this.modelType).forEach(([i, j]) => {

      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      // If score is null, just show the keypoint.
      const score1 = kp1.score != null ? kp1.score : 1;
      const score2 = kp2.score != null ? kp2.score : 1;

      if (this.headKeypoints.includes(kp1.name) && this.headKeypoints.includes(kp2.name) &&
        score1 >= this.scoreThreshold && score2 >= this.scoreThreshold) {
        this.ctx.beginPath();
        this.ctx.moveTo(kp1.x, kp1.y);
        this.ctx.lineTo(kp2.x, kp2.y);
        this.ctx.stroke();
      }

      // Store keypoints for left and right eye outer
      if (kp1.name === 'left_ear') leftEar = kp1;
      if (kp1.name === 'right_ear') rightEar = kp1;
      if (kp2.name === 'left_ear') leftEar = kp2;
      if (kp2.name === 'right_ear') rightEar = kp2;
    });

    // Draw circle around the head
    if (leftEar && rightEar) {
      const centerX = (leftEar.x + rightEar.x) / 2;
      const centerY = (leftEar.y + rightEar.y) / 2;
      offsetY = (centerY * 0.1);
      const dx = rightEar.x - leftEar.x;
      const dy = rightEar.y - leftEar.y;
      const radius = Math.sqrt(dx * dx + dy * dy) / 2;

      // Increase the radius to better cover the head
      const scaleFactor = 1.5; // Adjust this factor as needed
      const adjustedRadius = radius * scaleFactor;

      this.topmostPoint = {
        x: centerX,
        y: centerY - adjustedRadius - offsetY,
        radius: adjustedRadius,
      };

      this.headCircle = { x: this.topmostPoint.x, y: centerY - offsetY, radius: adjustedRadius };
      this.ctx.beginPath();
      this.ctx.arc(this.headCircle.x, this.headCircle.y, adjustedRadius, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Draw the keypoint as a circle
      this.ctx.fillStyle = 'Red';
      this.ctx.strokeStyle = 'White';
      this.ctx.lineWidth = 2;
      const circle = new Path2D();
      circle.arc(this.topmostPoint.x, this.topmostPoint.y, 4, 0, 2 * Math.PI);
      this.ctx.fill(circle);
      this.ctx.stroke(circle);
    }
  }



}
