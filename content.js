
(function () {
  'use strict';

  // 创建控制面板
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'douyin-ext-panel';
    panel.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      width: 240px;
      font-size: 14px;
      font-family: sans-serif;
    `;

    panel.innerHTML = `
      <div id="panel-header" style="cursor: move; user-select: none; padding-bottom: 6px; border-bottom: 1px solid #666; display: flex; justify-content: space-between; align-items: center;">
        <span>播放器控制</span>
        <button id="toggle-btn" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer; line-height:1;">−</button>
      </div>
      <div id="panel-body">
        <label for="speed-slider">播放速度: <span id="speed-value">1.00x</span></label>
        <input type="range" id="speed-slider" min="0.1" max="4" step="0.05" value="1" />
        
        <div style="margin-top:10px;">
          <label>循环播放区间 (秒)：</label>
          <input type="number" id="point-a" placeholder="A点 (开始)" style="width: 45%; margin-right: 5%;" min="0" step="0.1"/>
          <input type="number" id="point-b" placeholder="B点 (结束)" style="width: 45%;" min="0" step="0.1"/>
        </div>
        <button id="start-loop-btn" style="margin-top: 6px;">开始循环播放</button>
        <button id="stop-loop-btn" style="margin-top: 6px;">停止循环播放</button>

        <button id="screenshot-btn" style="margin-top:8px;">截图保存</button>
        <button id="pip-btn" style="margin-top:8px;">浮动播放（画中画）</button>
      </div>
      <a id="github-link" href="https://github.com/yang-shuohao/douyin-enhancer" target="_blank" style="display:block; margin-top: 10px; color: #0cf;">
        🌟 GitHub 项目页
      </a>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  // 拖动功能
  function makeDraggable(element, handle) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      mouseX = e.clientX;
      mouseY = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      posX = mouseX - e.clientX;
      posY = mouseY - e.clientY;
      mouseX = e.clientX;
      mouseY = e.clientY;
      element.style.top = (element.offsetTop - posY) + "px";
      element.style.left = (element.offsetLeft - posX) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function getVideo() {
    const video = [...document.querySelectorAll('video')].find(v => v.readyState >= 2);
    if (video) {
      video.removeAttribute('disablePictureInPicture');
    }
    return video;
  }

  function setSpeed(speed) {
    const video = getVideo();
    if (video) video.playbackRate = speed;
    const speedValue = document.getElementById('speed-value');
    if (speedValue) speedValue.textContent = speed.toFixed(2) + 'x';
  }

  function takeScreenshot() {
    const video = getVideo();
    if (!video) return alert('未找到视频元素，截图失败');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return alert('截图失败，请重试');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `douyin-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  let loopInterval = null;

  function startLoop() {
    const video = getVideo();
    if (!video) return alert('未找到视频元素');

    const aInput = document.getElementById('point-a');
    const bInput = document.getElementById('point-b');

    const pointA = parseFloat(aInput.value);
    const pointB = parseFloat(bInput.value);

    if (isNaN(pointA) || isNaN(pointB)) {
      alert('请填写有效的循环时间');
      return;
    }

    if (pointA < 0 || pointB <= pointA || pointB > video.duration) {
      alert(`请确保 0 <= A < B <= ${video.duration.toFixed(1)} 秒`);
      return;
    }

    video.currentTime = pointA;
    video.play();

    if (loopInterval) clearInterval(loopInterval);
    loopInterval = setInterval(() => {
      if (video.currentTime >= pointB) {
        video.currentTime = pointA;
      }
    }, 200);
  }

  function stopLoop() {
    if (loopInterval) {
      clearInterval(loopInterval);
      loopInterval = null;
    }
  }

  function init() {
    const panel = createPanel();

    const slider = panel.querySelector('#speed-slider');
    const pipBtn = panel.querySelector('#pip-btn');
    const screenshotBtn = panel.querySelector('#screenshot-btn');
    const toggleBtn = panel.querySelector('#toggle-btn');
    const panelBody = panel.querySelector('#panel-body');
    const panelHeader = panel.querySelector('#panel-header');
    const startLoopBtn = panel.querySelector('#start-loop-btn');
    const stopLoopBtn = panel.querySelector('#stop-loop-btn');

    const savedSpeed = parseFloat(localStorage.getItem('douyin-speed')) || 1;
    slider.value = savedSpeed;
    setSpeed(savedSpeed);

    slider.addEventListener('input', e => {
      const speed = parseFloat(e.target.value);
      setSpeed(speed);
      localStorage.setItem('douyin-speed', speed);
    });

    pipBtn.addEventListener('click', async () => {
      const video = getVideo();
      if (!video) return alert('找不到视频元素');

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          pipBtn.textContent = '浮动播放（画中画）';
        } else {
          await video.requestPictureInPicture();
          pipBtn.textContent = '退出画中画';
        }
      } catch (err) {
        alert('画中画启动失败: ' + err.message);
      }
    });

    screenshotBtn.addEventListener('click', takeScreenshot);
    startLoopBtn.addEventListener('click', startLoop);
    stopLoopBtn.addEventListener('click', () => {
      stopLoop();
      const video = getVideo();
      if (video) video.pause();
    });

    toggleBtn.addEventListener('click', () => {
      if (panelBody.style.display === 'none') {
        panelBody.style.display = 'block';
        toggleBtn.textContent = '−';
      } else {
        panelBody.style.display = 'none';
        toggleBtn.textContent = '+';
      }
    });

    makeDraggable(panel, panelHeader);
  }

  function waitForVideo() {
    if (getVideo()) {
      init();
    } else {
      setTimeout(waitForVideo, 500);
    }
  }

  waitForVideo();
})();
