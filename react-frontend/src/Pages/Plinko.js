import React, { useState, useEffect, useRef } from 'react';
import Matter from 'matter-js';

const Plinko = () => {
    // Set canvas dimensions
    const canvasWidth = window.innerWidth * 0.9;
    const canvasHeight = window.innerHeight * 0.8;

    // Define multipliers for each slot at the bottom
    const multipliers = [50, 20, 7, 4, 3, 1, 1, 0, 0, 0, 1, 1, 3, 4, 7, 20, 50];

    // Keep track of remaining balls and player score
    const [ballsLeft, setBallsLeft] = useState(10);
    const [score, setScore] = useState(0);

    const canvasRef = useRef(null);
    const engineRef = useRef(Matter.Engine.create({
        gravity: { scale: 0.0007 },
    }));

    useEffect(() => {
        // Create the renderer
        const render = Matter.Render.create({
            canvas: canvasRef.current,
            engine: engineRef.current,
            options: {
                width: canvasWidth,
                height: canvasHeight,
                wireframes: false,
                background: '#14151f',
            },
        });
        Matter.Render.run(render);

        const runner = Matter.Runner.create();
        Matter.Runner.run(runner, engineRef.current);

        // Create pegs in a triangular formation
        const GAP = 40;
        const PEG_RADIUS = 5;
        const pegs = [];
        for (let row = 0; row < 16; row++) {
            const cols = row + 3;
            for (let col = 0; col < cols; col++) {
                const x = canvasWidth / 2 + (col - (cols - 1) / 2) * GAP;
                const y = GAP + row * GAP;
                const peg = Matter.Bodies.circle(x, y, PEG_RADIUS, {
                    isStatic: true,
                    render: { fillStyle: '#ffffff' },
                });
                pegs.push(peg);
            }
        }
        Matter.Composite.add(engineRef.current.world, pegs);

        // Create ground and multiplier zones
        const multiplierZones = multipliers.map((multiplier, i) => {
            const zoneWidth = canvasWidth / multipliers.length;
            const x = i * zoneWidth + zoneWidth / 2;
            const y = canvasHeight - 20;
            return {
                multiplier,
                body: Matter.Bodies.rectangle(x, y, zoneWidth, 10, {
                    isStatic: true,
                    label: `Multiplier-${multiplier}`,
                    render: { fillStyle: '#444444' },
                }),
            };
        });
        multiplierZones.forEach(zone => Matter.Composite.add(engineRef.current.world, zone.body));

        // Add collision handling for multiplier zones
        Matter.Events.on(engineRef.current, 'collisionStart', event => {
            event.pairs.forEach(({ bodyA, bodyB }) => {
                multiplierZones.forEach((zone) => {
                    if ((bodyA === zone.body || bodyB === zone.body) && ballsLeft > 0) {
                        const points = zone.multiplier;
                        setScore(prevScore => prevScore + points);
                        setBallsLeft(prevBalls => prevBalls - 1);
                        Matter.Composite.remove(engineRef.current.world, bodyA.label === 'Ball' ? bodyA : bodyB);
                    }
                });
            });
        });

        return () => {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            Matter.Engine.clear(engineRef.current);
        };
    }, [canvasWidth, canvasHeight, ballsLeft]);

    // Drop a ball from the top center of the canvas
    const dropBall = () => {
        if (ballsLeft > 0) {
            const ball = Matter.Bodies.circle(canvasWidth / 2, 0, 7, {
                restitution: 0.6,
                render: { fillStyle: '#f23' },
            });
            Matter.Composite.add(engineRef.current.world, ball);
            setBallsLeft(ballsLeft - 1);
        }
    };

    return (
        <div>
            <canvas ref={canvasRef}></canvas>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={dropBall}>Drop Ball</button>
                <div>Balls left: {ballsLeft}</div>
                <div>Score: {score}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                {multipliers.map((multiplier, index) => (
                    <div key={index} style={{ width: `${100 / multipliers.length}%`, textAlign: 'center', color: '#ffffff' }}>
                        x{multiplier}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Plinko;
