
// Offline Analysis Service
// Generates procedural cyberpunk/technical logs in Chinese without external API calls.

const SYSTEMS = ['视觉皮层', '面部肌群', '神经元网络', '生物特征扫描仪', '情感计算核心'];
const ACTIONS = ['检测到', '正在重组', '捕获', '分析显示', '解构中'];
const FEATURES = ['眼轮匝肌微颤', '嘴角细微上扬', '眉间距收缩', '瞳孔对焦锁定', '面部三角区充血', '颌骨肌肉紧张'];
const STATES = ['专注模式', '认知负荷过载', '情绪波动: 低', '静息状态', '警觉性: 高', '微表情活跃'];

export const analyzeFace = async (base64Image: string): Promise<string> => {
  // Simulate processing delay (0.5s to 1.5s)
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Randomly generate a technical looking log
  const system = SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  
  const rand = Math.random();

  if (rand > 0.7) {
      // Feature detection log
      const feature = FEATURES[Math.floor(Math.random() * FEATURES.length)];
      return `${action}${feature}，判定为${STATES[Math.floor(Math.random() * STATES.length)]}。`;
  } else if (rand > 0.4) {
      // System status log
      return `[系统] ${system}数据流同步完成，偏差率 ${(Math.random() * 0.5).toFixed(2)}%。`;
  } else {
      // Pure tech babble
      const code = Math.floor(Math.random() * 9000) + 1000;
      return `解析生物电信号序列 #${code}... 匹配度 ${(85 + Math.random() * 15).toFixed(1)}%。`;
  }
};
