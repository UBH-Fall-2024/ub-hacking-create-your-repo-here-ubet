import React, { useEffect, useRef } from "react";
import Matter, { Engine, Render, Runner, Bodies, Composite } from "matter-js";

function Plinko() {
    const sceneRef = useRef(null);

    useEffect(() => {
        const worldWidth = 800;
        const startPins = 5;
        const pinLines = 25;
        const pinSize = 3;
        const pinGap = 30;
        const ballSize = 5;
        const ballElastity = 0.75;

        // Create an engine
        const engine = Engine.create();
        const { world } = engine;

        // Create a renderer
        const render = Render.create({
            element: sceneRef.current, // Render within the ref element
            engine: engine,
            options: {
                width: worldWidth,
                height: 600,
                wireframes: false,
                background: "#f4f4f8"
            }
        });

        // Create pins
        const pins = [];
        for (let l = 0; l < pinLines; l++) {
            const linePins = startPins + l;
            const lineWidth = linePins * pinGap;
            for (let i = 0; i < linePins; i++) {
                const pin = Bodies.circle(
                    worldWidth / 2 - lineWidth / 2 + i * pinGap,
                    100 + l * pinGap,
                    pinSize,
                    { isStatic: true, render: { fillStyle: "#8b0000" } }
                );
                pins.push(pin);
            }
        }
        Composite.add(world, pins);

        // Create initial ball
        const ball = Bodies.circle(worldWidth / 2, 0, ballSize, {
            restitution: ballElastity,
            render: { fillStyle: "#00008b" }
        });
        Composite.add(world, [ball]);

        // Run the renderer and engine
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Click event to add more balls
        const handleClick = (e) => {
            const rect = sceneRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const newBall = Bodies.circle(x, y, ballSize, {
                restitution: ballElastity,
                render: { fillStyle: "#00008b" }
            });
            Composite.add(world, [newBall]);
        };

        // Attach click event
        sceneRef.current.addEventListener("click", handleClick);

        // Cleanup on component unmount
        return () => {
            Render.stop(render);
            Runner.stop(runner);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
            sceneRef.current.removeEventListener("click", handleClick);
        };
    }, []);

    return (
        <div>
            <h1>Welcome to Plinko</h1>
            <div ref={sceneRef} style={{ border: "1px solid black", margin: "20px auto", width: "800px", height: "600px" }} />
        </div>
    );
}

export default Plinko;
