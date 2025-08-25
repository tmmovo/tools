function getWeekdayNumber() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0（周日）-6（周六）
    const weekday = dayOfWeek === 0 ? 7 : dayOfWeek; // 转换为1-7（周一=1，周日=7）

    const generateLaTeX = () => {
        if (weekday === 1) return '4\\frac{-12}{4}';// 666史山代码发力了
        if (weekday === 2) return '4\\frac{-8}{4}';// 666史山代码发力了
        if (weekday === 3) return '4\\frac{-4}{4}';// 666史山代码发力了
        if (weekday === 4) return '4';
        if (weekday === 5) return '4\\frac{4}{4}';// 666史山代码发力了
        if (weekday === 6) return '4\\frac{8}{4}';// 666史山代码发力了
        if (weekday === 7) return '4\\frac{12}{4}';// 666史山代码发力了
    };

    return generateLaTeX();
}

function renderLatex() {
    const latexCode = getWeekdayNumber();
    const outputEl = document.getElementById('output');
    // 清空旧内容避免残留
    outputEl.textContent = '';
    katex.render(latexCode, outputEl, {
        throwOnError: false,
        displayMode: true,
    });
}

window.addEventListener('load', renderLatex);