
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
            if (!currentImage) return;

            const width = originalCanvas.width;
            const height = originalCanvas.height;

            // 获取原图像素数据
            const imageData = originalCtx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // 创建输出图像数据
            const outputData = resultCtx.createImageData(width, height);
            const output = outputData.data;

            const useLinear = useLinearCheckbox.checked;
            const premultiply = premultiplyCheckbox.checked;

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
            }

            // 显示处理结果并更新棋盘背景
            updateChessboardBackgroundWithData(outputData);

            // 更新下载链接
            updateDownloadLink();
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
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            
            function animate() {
                // 从右上到左下移动：X增加，Y减少
                chessboardOffset = (chessboardOffset + 1) % 40; // 增加移动速度
                updateChessboardBackground();
                animationId = requestAnimationFrame(animate);
            }
            animate();
        }

        function updateChessboardBackground() {
            const canvas = resultCanvas;
            const ctx = resultCtx;
            const width = canvas.width;
            const height = canvas.height;
            
            // 清除画布
            ctx.clearRect(0, 0, width, height);
            
            // 创建棋盘背景
            const chessboardSize = 20; // 每个方块的大小
            const offsetX = chessboardOffset; // X向右移动
            const offsetY = -chessboardOffset; // Y向上移动（从右上到左下）
            
            // 绘制棋盘背景
            for (let y = -offsetY; y < height + chessboardSize; y += chessboardSize) {
                for (let x = -offsetX; x < width + chessboardSize; x += chessboardSize) {
                    const isDark = ((x + offsetX) / chessboardSize + (y + offsetY) / chessboardSize) % 2 >= 1;
                    
                    if (isDark) {
                        ctx.fillStyle = '#000000'; // 黑色方块
                    } else {
                        ctx.fillStyle = '#CCCCCC'; // 浅灰色方块
                    }
                    
                    ctx.fillRect(x, y, chessboardSize, chessboardSize);
                }
            }
            
            // 如果有水印图像数据，则绘制水印
            if (currentImageData) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.putImageData(currentImageData, 0, 0);
            }
        }

        function updateChessboardBackgroundWithData(imageData) {
            // 保存当前图像数据用于动画更新
            currentImageData = imageData;
            
            // 更新棋盘背景和水印
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