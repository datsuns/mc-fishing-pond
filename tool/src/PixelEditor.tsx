import React, { useState, useEffect, useRef } from 'react';
import { Eraser, Trash2, PaintBucket } from 'lucide-react';

interface PixelEditorProps {
    initialTextureUrl?: string;
    onChange: (dataUrl: string) => void;
}

const COLORS = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#00ffff', '#ff00ff', '#888888', '#8b4513',
    '#ffa500', '#ffc0cb', '#4b0082', '#006400', '#800000'
];

const GRID_SIZE = 16;
type GridData = (string | null)[][];

export function PixelEditor({ initialTextureUrl, onChange }: PixelEditorProps) {
    // Initialize 16x16 grid
    const createEmptyGrid = () => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    const [grid, setGrid] = useState<GridData>(createEmptyGrid());
    const [color, setColor] = useState<string>('#000000');
    const [mode, setMode] = useState<'draw' | 'erase'>('draw');

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Parse initial image if provided (to allow editing existing images)
    useEffect(() => {
        if (!initialTextureUrl || initialTextureUrl.startsWith('data:image/png')) {
            // It's either empty or a data URL we just generated, skip parsing external
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = GRID_SIZE;
            canvas.height = GRID_SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);
            const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;

            const newGrid = createEmptyGrid();
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    const i = (y * GRID_SIZE + x) * 4;
                    const a = imageData[i + 3];
                    if (a > 0) {
                        const r = imageData[i];
                        const g = imageData[i + 1];
                        const b = imageData[i + 2];
                        newGrid[y][x] = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                }
            }
            setGrid(newGrid);
        };
        img.src = initialTextureUrl;
    }, [initialTextureUrl]);

    // Generate PNG data URL whenever grid changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cellColor = grid[y][x];
                if (cellColor) {
                    ctx.fillStyle = cellColor;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }

        // Only fire onChange if we actually have some data
        const hasData = grid.some(row => row.some(cell => cell !== null));
        if (hasData) {
            onChange(canvas.toDataURL('image/png'));
        }
    }, [grid]);

    const handlePointerDown = (x: number, y: number, e: React.PointerEvent) => {
        updateCell(x, y, e.button === 2 || mode === 'erase'); // Right click forces erase
    };

    const handlePointerEnter = (x: number, y: number, e: React.PointerEvent) => {
        if (e.buttons === 1) { // Left click drag
            updateCell(x, y, mode === 'erase');
        } else if (e.buttons === 2) { // Right click drag
            updateCell(x, y, true);
        }
    };

    const updateCell = (x: number, y: number, overwriteErase: boolean) => {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

        setGrid(prev => {
            const newGrid = [...prev].map(row => [...row]);
            newGrid[y][x] = overwriteErase ? null : color;
            return newGrid;
        });
    };

    const clearGrid = () => {
        if (confirm('Are you sure you want to clear the canvas?')) {
            setGrid(createEmptyGrid());
        }
    };

    return (
        <div className="flex flex-col gap-4 bg-[#1e1e1e] p-4 rounded-lg border border-gray-700 select-none">

            {/* Hidden canvas for PNG export */}
            <canvas ref={canvasRef} width={GRID_SIZE} height={GRID_SIZE} className="hidden" />

            <div className="flex gap-6">
                {/* The Grid Canvas */}
                <div
                    className="grid gap-0 bg-[#333] border border-gray-600 rounded overflow-hidden"
                    style={{
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        width: '256px',
                        height: '256px',
                        touchAction: 'none' // Prevent scrolling on touch
                    }}
                    onContextMenu={e => e.preventDefault()} // Block right-click menu
                >
                    {grid.map((row, y) => (
                        row.map((cellColor, x) => (
                            <div
                                key={`${x}-${y}`}
                                className="w-full h-full border-[0.5px] border-white/5"
                                style={{ backgroundColor: cellColor || 'transparent' }}
                                onPointerDown={(e) => handlePointerDown(x, y, e)}
                                onPointerEnter={(e) => handlePointerEnter(x, y, e)}
                            />
                        ))
                    ))}
                </div>

                {/* Tools and Palette */}
                <div className="flex flex-col gap-4 flex-1">

                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('draw')}
                            className={`flex items-center justify-center p-2 rounded transition-colors flex-1 ${mode === 'draw' ? 'bg-blue-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}
                        >
                            <PaintBucket size={18} className="mr-2" /> Draw
                        </button>
                        <button
                            onClick={() => setMode('erase')}
                            className={`flex items-center justify-center p-2 rounded transition-colors flex-1 ${mode === 'erase' ? 'bg-blue-600 text-white' : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'}`}
                        >
                            <Eraser size={18} className="mr-2" /> Erase
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-[#2a2a2a] p-3 rounded">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => { setColor(e.target.value); setMode('draw'); }}
                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none p-0"
                        />
                        <span className="text-sm font-mono text-gray-300">{color}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(c => (
                            <div
                                key={c}
                                onClick={() => { setColor(c); setMode('draw'); }}
                                className={`w-6 h-6 rounded cursor-pointer border-2 transition-transform hover:scale-110 ${color === c ? 'border-white' : 'border-transparent shadow-sm shadow-black/50'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="mt-auto">
                        <button
                            onClick={clearGrid}
                            className="flex items-center justify-center w-full py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded border border-red-500/20 transition-colors"
                            title="Clear Canvas"
                        >
                            <Trash2 size={16} className="mr-2" /> Clear All
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-xs text-gray-500 text-center">Left click & drag to draw. Right click & drag to erase.</p>
        </div>
    );
}
