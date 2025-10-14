
        // 获取DOM元素
        const fileInput = document.getElementById('fileInput');
        const originalCanvas = document.getElementById('originalCanvas');
        const resultCanvas = document.getElementById('resultCanvas');
        const downloadLink = document.getElementById('downloadLink');
        const useLinearCheckbox = document.getElementById('useLinear');
        const premultiplyCheckbox = document.getElementById('premultiplyAlpha');
        const uploadArea = document.getElementById('uploadArea');

        const originalCtx = originalCanvas.getContext('2d');
        const resultCtx = resultCanvas.getContext('2d');

        // 事件监听
        fileInput.addEventListener('change', handleFileSelect);
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        useLinearCheckbox.addEventListener('change', reprocessImage);
        premultiplyCheckbox.addEventListener('change', reprocessImage);

        let currentImage = null;

        // 处理文件选择
        function handleFileSelect(event) {
            const file = event.target.files[0];
            if (file && file.type.match('image.*')) {
                loadImage(file);
            }
        }

        // 处理拖拽
        function handleDragOver(event) {
            event.preventDefault();
            event.stopPropagation();
            uploadArea.style.background = 'rgba(75, 108, 183, 0.2)';
        }

        function handleDrop(event) {
            event.preventDefault();
            event.stopPropagation();
            uploadArea.style.background = 'rgba(75, 108, 183, 0.05)';
            
            const files = event.dataTransfer.files;
            if (files.length > 0 && files[0].type.match('image.*')) {
                loadImage(files[0]);
            }
        }

        // 加载图片
        function loadImage(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    currentImage = img;
                    displayOriginalImage(img);
                    processWatermark();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        // 显示原图
        function displayOriginalImage(img) {
            // 调整canvas大小以适应图片
            const maxWidth = 400;
            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (maxHeight / height) * width;
                height = maxHeight;
            }

            originalCanvas.width = resultCanvas.width = width;
            originalCanvas.height = resultCanvas.height = height;

            originalCtx.clearRect(0, 0, width, height);
            originalCtx.drawImage(img, 0, 0, width, height);
        }

        // 重新处理图片（当选项改变时）
        function reprocessImage() {
            if (currentImage) {
                processWatermark();
            }
        }

        // 处理水印提取
        function processWatermark() {
            console.log('processWatermark started');
            if (!currentImage) {
                console.log('No current image, returning');
                return;
            }

            const width = originalCanvas.width;
            const height = originalCanvas.height;
            console.log('Processing watermark with dimensions:', { width, height });

            // 获取原图像素数据
            const imageData = originalCtx.getImageData(0, 0, width, height);
            const data = imageData.data;
            console.log('Original image data length:', data.length);

            // 创建输出图像数据
            const outputData = resultCtx.createImageData(width, height);
            const output = outputData.data;

            const useLinear = useLinearCheckbox.checked;
            const premultiply = premultiplyCheckbox.checked;
            console.log('Processing options:', { useLinear, premultiply });

            let transparentPixels = 0;
            let opaquePixels = 0;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // 如果是纯黑色背景，设置为完全透明
                if (r === 0 && g === 0 && b === 0) {
                    output[i] = 0;     // R
                    output[i + 1] = 0; // G
                    output[i + 2] = 0; // B
                    output[i + 3] = 0; // A
                    transparentPixels++;
                    continue;
                }

                // 计算透明度（基于最大RGB分量）
                let alpha;
                if (useLinear) {
                    // 使用线性光计算（更精确）
                    const maxComponent = Math.max(r, g, b);
                    alpha = maxComponent / 255;
                    
                    // 伽马校正（sRGB到线性）
                    const linearAlpha = alpha <= 0.04045 ? alpha / 12.92 : Math.pow((alpha + 0.055) / 1.055, 2.4);
                    alpha = linearAlpha;
                } else {
                    // 简单计算（直接使用最大值）
                    alpha = Math.max(r, g, b) / 255;
                }

                // 确保alpha在合理范围内
                alpha = Math.max(0, Math.min(1, alpha));

                if (premultiply) {
                    // 预乘Alpha通道
                    output[i] = 255;     // R
                    output[i + 1] = 255; // G
                    output[i + 2] = 255; // B
                    output[i + 3] = Math.round(alpha * 255); // A
                } else {
                    // 直接设置白色和计算出的透明度
                    output[i] = 255;     // R
                    output[i + 1] = 255; // G
                    output[i + 2] = 255; // B
                    output[i + 3] = Math.round(alpha * 255); // A
                }
                
                if (alpha > 0.1) {
                    opaquePixels++;
                }
            }

            console.log('Pixel statistics:', { transparentPixels, opaquePixels, totalPixels: width * height });

            // 显示处理结果并更新棋盘背景
            updateChessboardBackgroundWithData(outputData);

            // 更新下载链接
            updateDownloadLink();
            console.log('processWatermark completed');
        }

        // 更新下载链接
        function updateDownloadLink() {
            try {
                const dataURL = resultCanvas.toDataURL('image/png');
                downloadLink.href = dataURL;
            } catch (error) {
                console.error('生成下载链接失败:', error);
            }
        }

        // 初始化棋盘背景动画
        let chessboardOffset = 0;
        let animationId = null;
        let currentImageData = null;

        function startChessboardAnimation() {
            console.log('Starting chessboard animation');
            if (animationId) {
                console.log('Cancelling existing animation');
                cancelAnimationFrame(animationId);
            }
            
            let frameCount = 0;
            let lastTime = performance.now();
            
            function animate(currentTime) {
                frameCount++;
                
                // 计算时间增量，确保按像素缓慢移动
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;
                
                // 按像素移动：每帧移动0.5像素（缓慢移动）
                const pixelsPerSecond = 30; // 每秒移动30像素
                const pixelsPerFrame = (pixelsPerSecond * deltaTime) / 1000;
                
                // 从右上到左下移动：X增加，Y减少
                chessboardOffset = (chessboardOffset + pixelsPerFrame) % 1000; // 使用大模数确保平滑
                
                if (frameCount % 60 === 0) { // 每60帧输出一次调试信息
                    console.log(`Animation frame ${frameCount}, offset: ${chessboardOffset.toFixed(2)}, deltaTime: ${deltaTime.toFixed(2)}ms`);
                }
                
                updateChessboardBackground();
                animationId = requestAnimationFrame(animate);
            }
            animate(performance.now());
        }

        function updateChessboardBackground() {
            const canvas = resultCanvas;
            const ctx = resultCtx;
            const width = canvas.width;
            const height = canvas.height;
            
            // 清除画布
            ctx.clearRect(0, 0, width, height);
            
            // 创建伪无限棋盘背景
            const chessboardSize = 20; // 每个方块的大小
            
            // 使用浮点数偏移量实现像素级平滑移动
            const offsetX = chessboardOffset % chessboardSize; // X方向偏移
            const offsetY = (-chessboardOffset % chessboardSize + chessboardSize) % chessboardSize; // Y方向偏移
            
            // 计算需要绘制的棋盘范围，确保完全覆盖画布且不会出现短暂消失
            const extraTiles = 3; // 增加额外边界确保完全覆盖
            const startX = Math.floor(-chessboardSize * extraTiles);
            const startY = Math.floor(-chessboardSize * extraTiles);
            const endX = Math.ceil(width + chessboardSize * extraTiles);
            const endY = Math.ceil(height + chessboardSize * extraTiles);
            
            // 使用整数坐标绘制，避免浮点数精度问题
            const startGridX = Math.floor(startX / chessboardSize) * chessboardSize;
            const startGridY = Math.floor(startY / chessboardSize) * chessboardSize;
            const endGridX = Math.ceil(endX / chessboardSize) * chessboardSize;
            const endGridY = Math.ceil(endY / chessboardSize) * chessboardSize;
            
            // 先绘制所有浅灰色背景
            ctx.fillStyle = '#CCCCCC';
            ctx.fillRect(startX, startY, endX - startX, endY - startY);
            
            // 然后绘制黑色格子
            ctx.fillStyle = '#000000';
            for (let y = startGridY; y < endGridY; y += chessboardSize) {
                for (let x = startGridX; x < endGridX; x += chessboardSize) {
                    // 计算格子的实际位置（考虑偏移）
                    const gridX = x + offsetX;
                    const gridY = y + offsetY;
                    
                    // 判断是否为黑色格子（使用更稳定的计算方法）
                    const gridIndexX = Math.floor((gridX + chessboardSize * 1000) / chessboardSize);
                    const gridIndexY = Math.floor((gridY + chessboardSize * 1000) / chessboardSize);
                    const isDark = (gridIndexX + gridIndexY) % 2 === 0;
                    
                    if (isDark) {
                        // 确保黑色格子完全覆盖浅灰色背景
                        ctx.fillRect(gridX, gridY, chessboardSize, chessboardSize);
                    }
                }
            }
            
            // 如果有水印图像数据，则使用不同的方法绘制水印，确保棋盘背景可见
            if (currentImageData) {
                // 创建一个临时canvas来绘制水印
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // 在临时canvas上绘制水印
                tempCtx.putImageData(currentImageData, 0, 0);
                
                // 在主画布上绘制临时canvas，使用source-over合成模式
                // 这样透明区域会显示棋盘背景，不透明区域显示水印
                ctx.drawImage(tempCanvas, 0, 0);
            }
        }

        function updateChessboardBackgroundWithData(imageData) {
            console.log('updateChessboardBackgroundWithData called', {
                imageDataWidth: imageData.width,
                imageDataHeight: imageData.height
            });
            
            // 保存当前图像数据用于动画更新
            currentImageData = imageData;
            
            // 立即更新棋盘背景和水印
            updateChessboardBackground();
        }

        // 初始化棋盘背景
        function initializeChessboard() {
            const canvas = resultCanvas;
            const ctx = resultCtx;
            const width = canvas.width || 400;
            const height = canvas.height || 300;
            
            // 设置默认画布大小
            if (canvas.width === 0) {
                canvas.width = width;
                canvas.height = height;
            }
            
            // 绘制初始棋盘背景
            updateChessboardBackground();
        }

        // 初始化
        initializeChessboard();
        startChessboardAnimation();