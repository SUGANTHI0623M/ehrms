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
    const [clockSize, setClockSize] = useState(200);

    useEffect(() => {
        if (date) {
            setSelectedDate(date);
        }
    }, [date]);

    // Update clock size based on container width and screen size
    useEffect(() => {
        const updateClockSize = () => {
            if (clockRef.current) {
                const width = clockRef.current.offsetWidth;
                // Ensure minimum size for very small screens
                const minSize = 140;
                const maxSize = 220;
                const calculatedSize = Math.max(minSize, Math.min(maxSize, width));
                setClockSize(calculatedSize);
            }
        };
        // Initial update
        updateClockSize();
        // Update on resize with debounce
        let timeoutId: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateClockSize, 100);
        };
        window.addEventListener('resize', handleResize);
        // Also update when component mounts or when container might change
        const observer = new ResizeObserver(updateClockSize);
        if (clockRef.current) {
            observer.observe(clockRef.current);
        }
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
            if (clockRef.current) {
                observer.unobserve(clockRef.current);
            }
        };
    }, []);

    // Derived state for clock face - use fixed viewBox size for calculations
    const viewBoxSize = 220; // Fixed viewBox size
    const radius = viewBoxSize * 0.4; // 40% of viewBox size
    const center = viewBoxSize / 2; // 110
    const numbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    // Calculate hand position (for SVG viewBox)
    let value = mode === 'hour' ? selectedDate.getHours() % 12 || 12 : selectedDate.getMinutes();
    const total = mode === 'hour' ? 12 : 60;
    const angle = (value / total) * 360;

    // Convert angle to radians
    const rad = (angle - 90) * (Math.PI / 180);
    const handX = center + radius * Math.cos(rad);
    const handY = center + radius * Math.sin(rad);
    
    // Scale factor for number positions based on actual clock size
    const scaleFactor = clockSize / viewBoxSize;

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
        const currentCenter = rect.width / 2;
        // @ts-ignore
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        // @ts-ignore
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // If client coords are missing (e.g. touchend), we might need to skip or use changedTouches
        if (clientX === undefined || clientY === undefined) return;

        const x = clientX - rect.left - currentCenter;
        const y = clientY - rect.top - currentCenter;

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
        <div className="flex flex-col items-center bg-white p-2 sm:p-3 md:p-4 lg:p-4 rounded-lg select-none w-full min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[300px] max-w-full sm:max-w-[320px] mx-auto">
            <div className="flex items-center justify-between w-full mb-2 sm:mb-3 md:mb-4 px-1">
                <span className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-slate-800">Set Time</span>
                <div className="flex gap-1 sm:gap-1.5 md:gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('hour')}
                        className={cn("px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded text-xs sm:text-sm", mode === 'hour' ? "bg-primary/10 text-primary" : "text-slate-500")}
                    >
                        Hour
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('minute')}
                        className={cn("px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded text-xs sm:text-sm", mode === 'minute' ? "bg-primary/10 text-primary" : "text-slate-500")}
                    >
                        Minute
                    </button>
                </div>
            </div>

            <div className="relative w-full max-w-[160px] h-[160px] sm:max-w-[180px] sm:h-[180px] md:max-w-[200px] md:h-[200px] lg:max-w-[220px] lg:h-[220px] mx-auto my-2 sm:my-3 md:my-4 touch-none aspect-square">
                <div
                    ref={clockRef}
                    className="absolute inset-0 rounded-full border-4 border-slate-100 bg-white shadow-inner flex items-center justify-center cursor-pointer"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                >
                    {/* Clock Face SVG */}
                    <svg 
                        width="100%" 
                        height="100%" 
                        viewBox="0 0 220 220"
                        className="absolute inset-0 pointer-events-none z-10 transition-all duration-75"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {/* Center Dot */}
                        <circle cx="110" cy="110" r="4" className="fill-primary" />
                        {/* Hand */}
                        <line
                            x1="110"
                            y1="110"
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
                        const offset = clockSize < 180 ? 12 : clockSize < 200 ? 14 : 15;
                        // Calculate position in viewBox coordinates, then scale to actual size
                        const viewBoxX = center + (radius - offset) * Math.cos(numAngle);
                        const viewBoxY = center + (radius - offset) * Math.sin(numAngle);
                        const x = viewBoxX * scaleFactor;
                        const y = viewBoxY * scaleFactor;
                        const isSelected = (selectedDate.getHours() % 12 || 12) === num;

                        return (
                            <div
                                key={num}
                                className={cn(
                                    "absolute rounded-full flex items-center justify-center font-medium transition-colors z-20 pointer-events-none",
                                    clockSize < 180 ? "w-5 h-5 -ml-2.5 -mt-2.5 text-[10px]" :
                                    clockSize < 200 ? "w-6 h-6 sm:w-7 sm:h-7 -ml-3 sm:-ml-3.5 -mt-3 sm:-mt-3.5 text-xs sm:text-sm" :
                                    "w-7 h-7 md:w-8 md:h-8 -ml-3.5 md:-ml-4 -mt-3.5 md:-mt-4 text-sm md:text-base",
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
                        const offset = clockSize < 180 ? 12 : clockSize < 200 ? 14 : 15;
                        // Calculate position in viewBox coordinates, then scale to actual size
                        const viewBoxX = center + (radius - offset) * Math.cos(numAngle);
                        const viewBoxY = center + (radius - offset) * Math.sin(numAngle);
                        const x = viewBoxX * scaleFactor;
                        const y = viewBoxY * scaleFactor;
                        const currentMin = selectedDate.getMinutes();
                        const isSelected = Math.abs(currentMin - num) < 2.5;

                        return (
                            <div
                                key={num}
                                className={cn(
                                    "absolute rounded-full flex items-center justify-center font-medium transition-colors z-20 pointer-events-none",
                                    clockSize < 180 ? "w-5 h-5 -ml-2.5 -mt-2.5 text-[10px]" :
                                    clockSize < 200 ? "w-6 h-6 sm:w-7 sm:h-7 -ml-3 sm:-ml-3.5 -mt-3 sm:-mt-3.5 text-xs sm:text-sm" :
                                    "w-7 h-7 md:w-8 md:h-8 -ml-3.5 md:-ml-4 -mt-3.5 md:-mt-4 text-sm md:text-base",
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
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 mt-2 w-full flex-wrap">
                {/* Hour */}
                <div className="flex flex-col items-center p-1 sm:p-1.5 md:p-2 bg-slate-50 rounded-md border">
                    <InputSpinner
                        value={format(selectedDate, 'hh')}
                        onChange={(v) => handleTimeChange('hour', parseInt(v))}
                        min={1} max={12}
                    />
                </div>
                <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-300">:</span>
                {/* Minute */}
                <div className="flex flex-col items-center p-1 sm:p-1.5 md:p-2 bg-slate-50 rounded-md border">
                    <InputSpinner
                        value={format(selectedDate, 'mm')}
                        onChange={(v) => handleTimeChange('minute', parseInt(v))}
                        min={0} max={59} pad
                    />
                </div>
                {/* AM/PM */}
                <div className="flex flex-col gap-0.5 sm:gap-1 ml-0.5 sm:ml-1 md:ml-2">
                    <button
                        type="button"
                        onClick={() => handleTimeChange('ampm', 'AM')}
                        className={cn(
                            "px-2 sm:px-2.5 md:px-3 lg:px-3.5 py-0.5 sm:py-1 md:py-1.5 text-xs sm:text-xs md:text-sm font-bold rounded border transition-colors touch-manipulation",
                            format(selectedDate, 'a') === 'AM' ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200 hover:border-primary"
                        )}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTimeChange('ampm', 'PM')}
                        className={cn(
                            "px-2 sm:px-2.5 md:px-3 lg:px-3.5 py-0.5 sm:py-1 md:py-1.5 text-xs sm:text-xs md:text-sm font-bold rounded border transition-colors touch-manipulation",
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
            <button type="button" onClick={increment} className="text-slate-400 hover:text-primary active:text-primary p-0.5 sm:p-1 touch-manipulation">
                <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
            </button>
            <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-mono font-semibold text-slate-700 my-0.5 sm:my-1 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] text-center">{value}</span>
            <button type="button" onClick={decrement} className="text-slate-400 hover:text-primary active:text-primary p-0.5 sm:p-1 touch-manipulation">
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5" />
            </button>
        </div>
    );
};

export default ClockTimePicker;
