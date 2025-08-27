document.addEventListener('DOMContentLoaded', function() {
    const toolSelect = document.getElementById('tool');
    const customToolInput = document.getElementById('custom-tool-input');
    const customPropsCheckbox = document.getElementById('custom-props');
    const customPropsInputs = document.getElementById('custom-props-inputs');
    const calculateButton = document.getElementById('calculate');
    const resultDiv = document.getElementById('result');
    
    // 显示/隐藏自定义工具速度输入
    toolSelect.addEventListener('change', function() {
        customToolInput.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    
    // 显示/隐藏自定义属性输入
    customPropsCheckbox.addEventListener('change', function() {
        customPropsInputs.style.display = this.checked ? 'block' : 'none';
    });
    
    // 计算按钮点击事件
    calculateButton.addEventListener('click', function() {
        calculateMiningTime();
    });
    
    function calculateMiningTime() {
        // 获取输入值
        const version = document.getElementById('version').value;
        let toolSpeed = parseFloat(document.getElementById('tool').value);
        const efficiency = parseInt(document.getElementById('efficiency').value) || 0;
        const aquaAffinity = parseInt(document.getElementById('aqua-affinity').value) || 0;
        const haste = parseInt(document.getElementById('haste').value) || 0;
        const fatigue = parseInt(document.getElementById('fatigue').value) || 0;
        const onGround = document.getElementById('on-ground').checked;
        const inWater = document.getElementById('in-water').checked;
        const useCustomProps = document.getElementById('custom-props').checked;
        const hardness = parseFloat(document.getElementById('hardness').value) || 0;
        
        // 自定义工具速度
        if (document.getElementById('tool').value === 'custom') {
            toolSpeed = parseFloat(document.getElementById('custom-tool-speed').value) || 1;
        }
        
        // 自定义属性
        let submergedSpeed = 0.2;
        let miningEfficiency = 0;
        let blockBreakSpeed = 1;
        
        if (useCustomProps) {
            submergedSpeed = parseFloat(document.getElementById('submerged-speed').value) || 0.2;
            miningEfficiency = parseFloat(document.getElementById('mining-efficiency').value) || 0;
            blockBreakSpeed = parseFloat(document.getElementById('block-break-speed').value) || 1;
        }
        
        // 检查硬度是否为-1（无法破坏）
        if (hardness === -1) {
            resultDiv.innerHTML = '无法破坏此方块！';
            resultDiv.style.display = 'block';
            resultDiv.className = 'result';
            return;
        }
        
        // 检查硬度是否为0（瞬间挖掘）
        if (hardness === 0) {
            if (version === 'java' && blockBreakSpeed <= 0) {
                resultDiv.innerHTML = '无法破坏此方块！';
            } else {
                resultDiv.innerHTML = '瞬间挖掘！';
                resultDiv.className = 'result instant';
            }
            resultDiv.style.display = 'block';
            return;
        }
        
        // 计算基础速度（考虑效率附魔）
        let baseSpeed = toolSpeed;
        if (baseSpeed > 1 && efficiency > 0) {
            baseSpeed += (efficiency * efficiency) + 1;
        }
        
        // 计算状态效果乘数
        let effectMultiplier = 1;
        
        // 急迫/潮涌能量效果
        if (haste > 0) {
            if (version === 'java') {
                effectMultiplier *= (1 + 0.2 * haste);
            } else {
                effectMultiplier *= (1 + 0.2 * haste) * Math.pow(1.2, haste);
            }
        }
        
        // 挖掘疲劳效果
        if (fatigue > 0) {
            if (version === 'java') {
                if (fatigue === 1) effectMultiplier *= 0.3;
                else if (fatigue === 2) effectMultiplier *= 0.09;
                else if (fatigue === 3) effectMultiplier *= 0.0027;
                else effectMultiplier *= 0.00081;
            } else {
                effectMultiplier *= Math.pow(0.21, fatigue);
            }
        }
        
        // 水中减速效果
        if (inWater) {
            if (version === 'java') {
                if (aquaAffinity > 0) {
                    effectMultiplier *= 1; // 水下速掘使水中挖掘速度恢复正常
                } else {
                    effectMultiplier *= submergedSpeed;
                }
            } else {
                if (aquaAffinity > 0) {
                    effectMultiplier *= 1; // 水下速掘使水中挖掘速度恢复正常
                } else {
                    effectMultiplier *= 0.2;
                }
            }
        }
        
        // 浮空减速效果
        if (!onGround) {
            effectMultiplier *= 0.2;
        }
        
        // Java版额外属性
        if (version === 'java') {
            effectMultiplier *= blockBreakSpeed;
        }
        
        // 计算挖掘速度
        const divisor = 30; // 假设总是合适工具（简化计算）
        const p = (baseSpeed * effectMultiplier) / (hardness * divisor);
        
        // 计算挖掘时间（游戏刻）
        let ticks = Math.ceil(1 / p);
        
        // 检查是否瞬间挖掘
        if (p >= 1) {
            resultDiv.innerHTML = '瞬间挖掘！';
            resultDiv.className = 'result instant';
        } else {
            const seconds = (ticks / 20).toFixed(2);
            let resultText = `需要 ${ticks} 刻 (${seconds} 秒)`;
            
            // 添加您要求的功能：当刻数小于20并大于0时提示
            if (ticks < 20 && ticks > 0) {
                resultText += '<br><strong>能快速破坏但不是瞬间破坏</strong>';
                resultDiv.className = 'result fast';
            } else {
                resultDiv.className = 'result';
            }
            
            resultDiv.innerHTML = resultText;
        }
        
        resultDiv.style.display = 'block';
    }
});