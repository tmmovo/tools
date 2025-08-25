        document.getElementById('startBtn').addEventListener('click', startTypingSimulation);

        // 转义HTML特殊字符（解决回放文件结构破坏问题）
        function escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // 分词函数（保留所有字符，修正分隔符正则）
        function tokenizeText(text) {
            // 修正：移除delimiters中的{}，避免被识别为分隔符
            const delimiters = /([\s\.,;:!?\(\)\[\]{}<>'"`~@#$%^&*+=\\\/|—、，。！？；：“”‘’（）【】《》])/g;
            const chineseRegex = /([\u4e00-\u9fa5]+)/g;
            let tokens = [];
            let lastIndex = 0;
            let match;

            while ((match = chineseRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    const nonChinese = text.substring(lastIndex, match.index);
                    // 分割非中文部分，过滤空字符串
                    tokens.push(...nonChinese.split(delimiters).filter(t => t !== ''));
                }
                tokens.push(match[0]); // 添加中文字符
                lastIndex = match.index + match[0].length;
            }

            // 处理剩余的非中文部分
            if (lastIndex < text.length) {
                const remaining = text.substring(lastIndex);
                tokens.push(...remaining.split(delimiters).filter(t => t !== ''));
            }

            // 过滤空token（确保至少有一个字符）
            return tokens.filter(token => token !== '');
        }

        // 生成带权重的随机延迟时间
        function generateWeightedDelay() {
            const useTypeA = Math.random() < 0.7;
            if (useTypeA) {
                return Math.floor(Math.pow(Math.random(), 2) * 100);
            } else {
                return 500 + Math.floor(Math.pow(Math.random(), 2) * 100);
            }
        }

        // 创建分词字典
        function createTokenDictionary(tokens) {
            return tokens.map(token => ({
                text: token,
                delay: generateWeightedDelay()
            }));
        }

        // 生成独立回放HTML（修复特殊字符问题）
        function generateReplayHTML(originalText, tokenDict) {
            const escapedText = escapeHTML(originalText);
            const escapedTokens = tokenDict.map(t => ({
                text: escapeHTML(t.text),
                delay: t.delay
            }));

            return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>打字效果回放</title>
    <style>
        .output {
            margin-top: 20px;
            min-height: 100px;
            position: relative;
        }
        .output .content {
            white-space: pre-wrap;
            font-family: monospace;
            line-height: 1.5;
            min-height: 1.2em; /* 防止空内容时高度塌陷 */
        }
        .output .cursor {
            display: inline-block;
            width: 2px;
            height: 1em;
            background-color: #333;
            margin-left: 2px;
            animation: blink 1s infinite;
            vertical-align: text-bottom;
            position: relative; /* 确保跟随文本位置 */
        }
		
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
    </style>
</head>
<body>
	<div class="container">
        <button id="replayBtn">开始回放</button>
        <div class="output" id="output">
            <span class="content"></span>
            <span class="cursor"></span>
        </div>
	</div>

    <script>
        const tokenDict = ${JSON.stringify(escapedTokens)};
        const originalText = ${JSON.stringify(escapedText)};
        
        document.getElementById('replayBtn').addEventListener('click', replayTyping);
        
        function replayTyping() {
            const replayBtn = document.getElementById('replayBtn');
            const contentSpan = document.querySelector('#output .content');
            const cursorSpan = document.querySelector('#output .cursor');
            
            replayBtn.disabled = true;
            contentSpan.textContent = '';
            
            async function play() {
                for (const token of tokenDict) {
                    const chars = token.text.split('');
                    
                    for (const char of chars) {
                        contentSpan.textContent += char;
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, token.delay));
                }
                replayBtn.disabled = false;
            }
            
            play();
        }
    </script>
</body>
</html>`;
        }

        // 主打字动画（优化DOM操作）
        async function startTypingSimulation() {
            const inputText = document.getElementById('inputText').value;
            if (!inputText.trim()) {
                alert('请输入文本内容');
                return;
            }
            
            const startBtn = document.getElementById('startBtn');
            const loading = document.getElementById('loading');
            const output = document.getElementById('output');
            const contentSpan = output.querySelector('#output .content');
            const cursorSpan = output.querySelector('#output .cursor');
            
            startBtn.disabled = true;
            loading.style.display = 'block';
            contentSpan.textContent = '';
            
            try {
                const tokens = tokenizeText(inputText);
                if (tokens.length === 0) {
                    throw new Error('输入文本无法分词，请检查是否包含有效字符');
                }
                const tokenDict = createTokenDictionary(tokens);
                
                loading.style.display = 'none';
                
                // 优化：使用textContent累积内容，减少DOM操作
                for (const token of tokenDict) {
                    const chars = token.text.split('');
                    
                    for (const char of chars) {
                        contentSpan.textContent += char;
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                    
                    // 词间停顿
                    await new Promise(resolve => setTimeout(resolve, token.delay));
                }
                
                // 生成回放文件（使用转义后的安全内容）
                const replayHTML = generateReplayHTML(inputText, tokenDict);
                const blob = new Blob([replayHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = 'typing_replay.html';
                downloadLink.textContent = '下载打字效果回放文件';
                downloadLink.className = 'download-link';
                
                document.querySelector('.container').appendChild(downloadLink);
                
            } catch (error) {
                console.error('处理出错:', error);
                output.querySelector('.content').textContent = '发生错误：' + error.message;
            } finally {
                startBtn.disabled = false;
            }
        }