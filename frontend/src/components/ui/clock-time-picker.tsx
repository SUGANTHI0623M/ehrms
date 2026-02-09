import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';

interface ClockTimePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
}

const ClockTimePicker: React.FC<ClockTimePickerProps> = ({ date, setDate }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(date || new Date());
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const clockRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (date) {
            setSelectedDate(date);
        }
    }, [date]);

    // Derived state for clock face
    const radius = 80;
    const center = 100;
    const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    // Calculate hand position
    let value = mode === 'hour' ? selectedDate.getHours() % 12 || 12 : selectedDate.getMinutes();
    const total = mode === 'hour' ? 12 : 60;
    const angle = (value / total) * 360;

    // Convert angle to radians
    const rad = (angle - 90) * (Math.PI / 180);
    const handX = center + radius * Math.cos(rad);
    const handY = center + radius * Math.sin(rad);

    const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', value: string | number) => {
        let newDate = new Date(selectedDate);
        let currentHours = newDate.getHours();

        if (type === 'hour') {
            let newHour = parseInt(value.toString());
            // Adjust for AM/PM
            if (currentHours >= 12 && newHour < 12) newHour += 12;
            if (currentHours < 12 && newHour === 12) newHour = 0; // 12 AM logic
            if (currentHours >= 12 && newHour === 12) newHour = 12; // 12 PM logic

            const isPM = currentHours >= 12;
            if (isPM && newHour < 12 && newHour !== 0) newHour += 12;
            if (!isPM && newHour === 12) newHour = 0;

            newDate = setHours(newDate, newHour);
        } else if (type === 'minute') {
            newDate = setMinutes(newDate, parseInt(value.toString()));
        } else if (type === 'ampm') {
            const isPM = value === 'PM';
            if (isPM && currentHours < 12) {
                newDate = setHours(newDate, currentHours + 12);
            } else if (!isPM && currentHours >= 12) {
                newDate = setHours(newDate, currentHours - 12);
            }
        }

        setSelectedDate(newDate);
        setDate(newDate);
    };

    const calculateTimeFromAngle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, isFinal: boolean = false) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // If client coords are missing (e.g. touchend), we might need to skip or use changedTouches
        if (clientX === undefined || clientY === undefined) return;

        const x = clientX - rect.left - center;
        const y = clientY - rect.top - center;

        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        if (mode === 'hour') {
            const hour = Math.round(angle / 30) || 12;
            // Update time immediately during drag
            handleTimeChange('hour', hour === 0 ? 12 : hour > 12 ? hour - 12 : hour);
        } else {
            const minute = Math.round(angle / 6);
            handleTimeChange('minute', minute === 60 ? 0 : minute);
        }
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        calculateTimeFromAngle(e as any);
    };

    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);

        // Finalize value if needed (already updated in move, but ensuring for click)
        // Note: touchend might not have coordinates, so we rely on the last move usually.
        // But for mouseup it does.

        // Auto switch to minutes if we just finished dragging hour
        if (mode === 'hour') {
            setMode('minute');
        }
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        e.stopPropagation();
        e.preventDefault();
        calculateTimeFromAngle(e);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleMouseMove, { passive: false });
            document.addEventListener('touchend', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleMouseMove);
                document.removeEventListener('touchend', handleMouseUp);
            };
        }
    }, [isDragging, mode, selectedDate]); // Add selectedDate to dependency to prevent stale closure if we didn't inline logic perfectly (but here we effectively are inside the component)

    return (
        <div className="flex flex-col items-center bg-white p-4 rounded-lg select-none">
            <div className="flex items-center justify-between w-full mb-4">
                <span className="text-lg font-semibold text-slate-800">Set Time</span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('hour')}
                        className={cn("px-2 py-1 rounded text-sm", mode === 'hour' ? "bg-primary/10 text-primary" : "text-slate-500")}
                    >
                        Hour
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('minute')}
                        className={cn("px-2 py-1 rounded text-sm", mode === 'minute' ? "bg-primary/10 text-primary" : "text-slate-500")}
                    >
                        Minute
                    </button>
                </div>
            </div>

            <div className="relative w-[200px] h-[200px] mx-auto my-4 touch-none">
                <div
                    ref={clockRef}
                    className="absolute inset-0 rounded-full border-4 border-slate-100 bg-white shadow-inner flex items-center justify-center cursor-pointer"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                >
                    {/* Clock Face SVG */}
                    <svg width="200" height="200" className="absolute inset-0 pointer-events-none z-10 transition-all duration-75">
                        {/* Center Dot */}
                        <circle cx="100" cy="100" r="4" className="fill-primary" />
                        {/* Hand */}
                        <line
                            x1="100"
                            y1="100"
                            x2={handX}
                            y2={handY}
                            className="stroke-primary stroke-[3]"
                            strokeLinecap="round"
                        />
                        <circle cx={handX} cy={handY} r="4" className="fill-primary" />
                    </svg>

                    {/* Numbers */}
                    {mode === 'hour' && numbers.map((num, i) => {
                        const numAngle = (i * 30 - 90) * (Math.PI / 180);
                        const x = center + (radius - 15) * Math.cos(numAngle); // Offset for text
                        const y = center + (radius - 15) * Math.sin(numAngle);
                        const isSelected = (selectedDate.getHours() % 12 || 12) === num;

                        return (
                            <div
                                key={num}
                                className={cn(
                                    "absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm font-medium transition-colors z-20 pointer-events-none",
                                    isSelected ? "bg-primary text-primary-foreground" : "text-slate-600"
                                )}
                                style={{ left: x, top: y }}
                            >
                                {num}
                            </div>
                        );
                    })}

                    {/* Minute marks */}
                    {mode === 'minute' && [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((num, i) => {
                        const numAngle = (i * 30 - 90) * (Math.PI / 180);
                        const x = center + (radius - 15) * Math.cos(numAngle);
                        const y = center + (radius - 15) * Math.sin(numAngle);
                        const currentMin = selectedDate.getMinutes();
                        const isSelected = Math.abs(currentMin - num) < 2.5;

                        return (
                            <div
                                key={num}
                                className={cn(
                                    "absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm font-medium transition-colors z-20 pointer-events-none",
                                    isSelected ? "bg-primary text-primary-foreground" : "text-slate-600"
                                )}
                                style={{ left: x, top: y }}
                            >
                                {num === 0 ? '00' : num}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Digital Selectors */}
            <div className="flex items-center gap-2 mt-2">
                {/* Hour */}
                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-md border">
                    <InputSpinner
                        value={format(selectedDate, 'hh')}
                        onChange={(v) => handleTimeChange('hour', parseInt(v))}
                        min={1} max={12}
                    />
                </div>
                <span className="text-xl font-bold text-slate-300">:</span>
                {/* Minute */}
                <div className="flex flex-col items-center p-2 bg-slate-50 rounded-md border">
                    <InputSpinner
                        value={format(selectedDate, 'mm')}
                        onChange={(v) => handleTimeChange('minute', parseInt(v))}
                        min={0} max={59} pad
                    />
                </div>
                {/* AM/PM */}
                <div className="flex flex-col gap-1 ml-2">
                    <button
                        type="button"
                        onClick={() => handleTimeChange('ampm', 'AM')}
                        className={cn(
                            "px-3 py-1 text-xs font-bold rounded border transition-colors",
                            format(selectedDate, 'a') === 'AM' ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200 hover:border-primary"
                        )}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTimeChange('ampm', 'PM')}
                        className={cn(
                            "px-3 py-1 text-xs font-bold rounded border transition-colors",
                            format(selectedDate, 'a') === 'PM' ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200 hover:border-primary"
                        )}
                    >
                        PM
                    </button>
                </div>
            </div>

        </div>
    );
};

// Helper for spinner inputs
const InputSpinner = ({ value, onChange, min, max, pad }: { value: string, onChange: (v: string) => void, min: number, max: number, pad?: boolean }) => {
    const numVal = parseInt(value);

    const increment = () => {
        let n = numVal + 1;
        if (n > max) n = min;
        onChange(pad ? n.toString().padStart(2, '0') : n.toString());
    };

    const decrement = () => {
        let n = numVal - 1;
        if (n < min) n = max;
        onChange(pad ? n.toString().padStart(2, '0') : n.toString());
    };

    return (
        <div className="flex flex-col items-center">
            <button type="button" onClick={increment} className="text-slate-400 hover:text-primary p-0.5"><ChevronUp className="h-4 w-4" /></button>
            <span className="text-xl font-mono font-semibold text-slate-700 my-1 min-w-[32px] text-center">{value}</span>
            <button type="button" onClick={decrement} className="text-slate-400 hover:text-primary p-0.5"><ChevronDown className="h-4 w-4" /></button>
        </div>
    );
};

export default ClockTimePicker;
