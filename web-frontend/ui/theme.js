// Theme - sprites, colors, fonts, sounds
export const theme = {
  fonts: {
    title: { family: 'Arial, sans-serif', size: 48, weight: 'bold' },
    button: { family: 'Arial, sans-serif', size: 28, weight: 'bold' },
    body: { family: 'Arial, sans-serif', size: 18, weight: 'normal' },
    small: { family: 'Arial, sans-serif', size: 14, weight: 'normal' },
  },

  colors: {
    text: '#FFFFFF',
    textShadow: '#000000',
    highlight: '#FFCC00',
    buttonText: '#FFFFFF',
    buttonHover: '#FFEE88',
    disabled: '#888888',
  },

  // Will be populated with actual sprite data after assets load
  sprites: {},

  sounds: {
    click: 'click',
    hover: 'hover',
  },

  // Button dimensions
  button: {
    width: 260,
    height: 50,
    cornerRadius: 8,
    bgColor: 'rgba(60, 80, 120, 0.85)',
    bgHover: 'rgba(80, 110, 160, 0.95)',
    bgActive: 'rgba(40, 60, 90, 0.95)',
    borderColor: '#88AADD',
    borderWidth: 2,
  },
};

export function applyFont(ctx, fontDef) {
  ctx.font = `${fontDef.weight} ${fontDef.size}px ${fontDef.family}`;
}

export function drawTextShadow(ctx, text, x, y, shadowOffset = 2) {
  ctx.fillStyle = theme.colors.textShadow;
  ctx.fillText(text, x + shadowOffset, y + shadowOffset);
  ctx.fillStyle = theme.colors.text;
  ctx.fillText(text, x, y);
}
