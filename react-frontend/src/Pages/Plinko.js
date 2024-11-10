import React, { useState, useEffect, useRef } from 'react';
import Matter from 'matter-js';

// Global positioning and scaling variables for multiplier display
const MULTIPLIER_VERTICAL_OFFSET = -140; // Controls vertical positioning of multipliers below the canvas
const MULTIPLIER_HORIZONTAL_OFFSET = 455; // Controls horizontal positioning of multipliers
const MULTIPLIER_WIDTH_SCALE = 0.5; // Controls the width scaling of multipliers (1 = 100% of canvas width)

// New variables for controlling the exact `x` and `y` position of multiplier collision zones
const MULTIPLIER_ZONE_X_OFFSET = 5; // Adjusts the horizontal position of multiplier zones
const MULTIPLIER_ZONE_Y_OFFSET = -30; // Adjusts the vertical position of multiplier zones

const Plinko = () => {
    // Set canvas dimensions
    const canvasWidth = window.innerWidth * 0.9;
    const canvasHeight = window.innerHeight * 0.8;

    // Define multipliers for each slot at the bottom
    const multipliers = [50, 20, 7, 4, 3, 1, 1, 0, 0, 0, 1, 1, 3, 4, 7, 20, 50];

    // Keep track of player balance and wager per ball
    const [balance, setBalance] = useState(1000); // Starting balance of $1000
    const [wager, setWager] = useState(1); // Wager per ball, default $1

    const canvasRef = useRef(null);
    const engineRef = useRef(Matter.Engine.create({
        gravity: { scale: 0.0005 },
    }));

    // Using useRef to track active balls so it doesn't reset on rerenders
    const activeBallsRef = useRef(new Set());

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

        // Create multiplier zones at the bottom, aligning them visually
        const multiplierZones = multipliers.map((multiplier, i) => {
            const zoneWidth = (canvasWidth * MULTIPLIER_WIDTH_SCALE) / multipliers.length;
            const x = i * zoneWidth + zoneWidth / 2 + (canvasWidth * (1 - MULTIPLIER_WIDTH_SCALE)) / 2 + MULTIPLIER_ZONE_X_OFFSET;
            const y = canvasHeight + MULTIPLIER_ZONE_Y_OFFSET; // Adjust y-position for collision zones

            return {
                multiplier,
                body: Matter.Bodies.rectangle(x, y, zoneWidth, 10, {
                    isStatic: true,
                    label: `Multiplier-${multiplier}`,
                    render: { 
                        fillStyle: '#4CAF50', // TEMPORARILY visible to verify alignment
                        opacity: 0.5 
                    }, // Temporarily make the zone visible to verify alignment
                }),
            };
        });
        multiplierZones.forEach(zone => Matter.Composite.add(engineRef.current.world, zone.body));

        // Add collision handling for multiplier zones
        Matter.Events.on(engineRef.current, 'collisionStart', event => {
            event.pairs.forEach(({ bodyA, bodyB }) => {
                multiplierZones.forEach((zone) => {
                    if ((bodyA === zone.body || bodyB === zone.body)) {
                        const ball = bodyA.label === 'Ball' ? bodyA : bodyB;
                        if (activeBallsRef.current.has(ball)) {
                            // Update balance based on the multiplier for this zone
                            const multiplierEffect = zone.multiplier * wager;
                            setBalance(prevBalance => prevBalance + multiplierEffect);

                            // Remove ball from Matter.js world and activeBallsRef
                            Matter.Composite.remove(engineRef.current.world, ball);
                            activeBallsRef.current.delete(ball);
                        }
                    }
                });
            });
        });

        return () => {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
            Matter.Engine.clear(engineRef.current);
        };
    }, [canvasWidth, canvasHeight, wager]);

    // Drop a ball from the top center of the canvas
    const dropBall = () => {
        if (balance >= wager) {
            const ball = Matter.Bodies.circle(canvasWidth / 2, 0, 7, {
                restitution: 0.6,
                label: 'Ball', // Label to identify balls during collision handling
                render: { fillStyle: '#f23' },
            });
            Matter.Composite.add(engineRef.current.world, ball);
            setBalance(prevBalance => prevBalance - wager);

            // Add to activeBallsRef set to track it for removal
            activeBallsRef.current.add(ball);
        } else {
            alert("Insufficient balance to drop a ball with the current wager.");
        }
    };

    // Handle wager input change
    const handleWagerChange = (event) => {
        const newWager = parseFloat(event.target.value);
        if (newWager > 0) {
            setWager(newWager);
        }
    };

    return (
        <div>
            <canvas ref={canvasRef}></canvas>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button onClick={dropBall}>Drop Ball</button>
                <div>Balance: ${balance.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <label>
                    Wager per ball: $
                    <input
                        type="number"
                        value={wager}
                        onChange={handleWagerChange}
                        min="0.1"
                        step="0.1"
                        style={{ width: '60px', marginLeft: '5px' }}
                    />
                </label>
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: `${MULTIPLIER_VERTICAL_OFFSET}px`, // Adjust vertical offset for visual display
                marginLeft: `${MULTIPLIER_HORIZONTAL_OFFSET}px`, // Adjust horizontal offset for visual display
                backgroundColor: '#14151f', // Dark background for visibility
                padding: '10px 0',
                width: `${canvasWidth * MULTIPLIER_WIDTH_SCALE}px`, // Adjust width with scaling factor
            }}>
                {multipliers.map((multiplier, index) => (
                    <div key={index} style={{
                        width: `${100 / multipliers.length}%`,
                        textAlign: 'center',
                        color: '#4CAF50', // Green color for text
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '1px solid #4CAF50', // Add outline to each multiplier
                        padding: '5px 0', // Adjust padding for visibility
                        boxSizing: 'border-box', // Ensure borders are included in width calculation
                    }}>
                        x{multiplier}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Plinko;
