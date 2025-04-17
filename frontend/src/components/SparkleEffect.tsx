import React, { useEffect, useRef } from 'react';
import '../sparkle-effect.css';

interface SparkleProps {
    count?: number;
}

const SparkleEffect: React.FC<SparkleProps> = ({ count = 50 }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear any existing sparkles
        containerRef.current.innerHTML = '';

        // Generate new sparkles
        for (let i = 0; i < count; i++) {
            createSparkle(containerRef.current);
        }
    }, [count]);

    const createSparkle = (container: HTMLDivElement) => {
        // Create sparkle element
        const sparkle = document.createElement('span');
        sparkle.textContent = '*';
        sparkle.classList.add('sparkle');

        // Randomly decide if this sparkle should also pulse
        if (Math.random() > 0.7) {
            sparkle.classList.add('pulse');
        }

        // Random positioning within the container
        const x = Math.random() * 100;
        const y = Math.random() * 100;

        // Random fire-like color
        const colors = [
            '#FFD700', // Gold
            '#FFA500', // Orange
            '#FF8C00', // Dark Orange
            '#FF4500', // Red-Orange
            '#FF6347'  // Tomato
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Random size (smaller for more distant appearance)
        const size = 12 + Math.random() * 24 + 'px';

        // Random timing for natural effect
        const duration = 2 + Math.random() * 4 + 's';
        const delay = Math.random() * 5 + 's';
        const opacityMax = 0.3 + Math.random() * 0.7;
        const rotate = Math.random() > 0.5 ? '15deg' : '-15deg';

        // For pulsing sparkles
        if (sparkle.classList.contains('pulse')) {
            const pulseDelay = Math.random() * 3 + 's';
            const pulseDuration = 1 + Math.random() * 3 + 's';
            const minOpacity = Math.random() * 0.3;
            const maxOpacity = 0.5 + Math.random() * 0.5;

            sparkle.style.setProperty('--pulse-delay', pulseDelay);
            sparkle.style.setProperty('--pulse-duration', pulseDuration);
            sparkle.style.setProperty('--min-opacity', minOpacity.toString());
            sparkle.style.setProperty('--max-opacity', maxOpacity.toString());
        }

        // Apply all calculated styles
        sparkle.style.setProperty('--color', color);
        sparkle.style.setProperty('--size', size);
        sparkle.style.setProperty('--duration', duration);
        sparkle.style.setProperty('--delay', delay);
        sparkle.style.setProperty('--opacity-max', opacityMax.toString());
        sparkle.style.setProperty('--rotate', rotate);
        sparkle.style.left = x + '%';
        sparkle.style.top = y + '%';

        container.appendChild(sparkle);
    };

    return (
        <div ref={containerRef} className="sparkle-container" aria-hidden="true" />
    );
};

export default SparkleEffect;