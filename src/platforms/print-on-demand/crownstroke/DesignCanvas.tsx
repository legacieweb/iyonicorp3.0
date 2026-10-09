import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MousePointer, Type, Image as ImageIcon, Palette, Undo2, Redo2,
  Trash2, Download, ChevronUp, ChevronDown, Lock, Unlock, Upload,
} from 'lucide-react';
import type { CrownStrokeLibraryItem, DesignElement, DesignElementType, ShapeType, TextElementData, ImageElementData, ShapeElementData, ExportFormat } from './crownStrokeTypes';
import { fontOptions, shapeOptions, DEFAULT_COLORS } from './crownStrokeTypes';
import './crown-stroke.css';

interface ActiveTool {
  type: 'select' | 'text' | 'image' | 'shape';
  shape?: ShapeType;
  shapeLabel?: string;
}

interface CanvasGesture {
  pointerId: number;
  elementId: string;
  mode: 'move' | 'scale' | 'rotate';
  start: { x: number; y: number };
  original: DesignElement;
  startDistance: number;
  startAngle: number;
  changed: boolean;
}

export interface DesignCanvasProps {
  width: number;
  height: number;
  elements: DesignElement[];
  background: string;
  onChange: (elements: DesignElement[]) => void;
  onBackgroundChange: (background: string) => void;
  onExport: (dataUrl: string, format: ExportFormat) => void;
  onAddImage?: (file: File) => void;
  libraryItems?: CrownStrokeLibraryItem[];
  historyResetKey?: number;
  readOnly?: boolean;
}

const HANDLE_SIZE = 12;
const HANDLE_OFFSET = 18;
const HIT_THRESHOLD = 10;

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  width,
  height,
  elements,
  background,
  onChange,
  onBackgroundChange,
  onExport,
  onAddImage,
  libraryItems = [],
  historyResetKey = 0,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureRef = useRef<CanvasGesture | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = requestAnimationFrame;
  const pendingRafRef = useRef<number | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>({ type: 'select' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<DesignElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [libraryCategory, setLibraryCategory] = useState<CrownStrokeLibraryItem['category']>('text');
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');

  const updateHistory = (newElements: DesignElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const pattern = ctx.createPattern(generateGrid(background), 'repeat');
    ctx.fillStyle = pattern || background;
    ctx.fillRect(0, 0, width, height);

    [...elements].sort((a, b) => a.z - b.z).forEach((element) => {
      drawElement(ctx, element);
    });

    if (selectedId && !readOnly) {
      const selected = elements.find((el) => el.id === selectedId);
      if (selected) {
        drawSelection(ctx, selected);
      }
    }
  }, [width, height, elements, selectedId, background, readOnly]);

  const generateGrid = (bgColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 20, 20);
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, 20);
    ctx.moveTo(0, 0.5);
    ctx.lineTo(20, 0.5);
    ctx.stroke();
    return canvas;
  };

  const drawElement = (ctx: CanvasRenderingContext2D, element: DesignElement) => {
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.scaleX, element.scaleY);
    ctx.globalAlpha = element.opacity;

    if (element.type === 'text') {
      const data = element.data as TextElementData;
      const fontFamily = data.fontFamily.split(',')[0] || 'Inter';
      ctx.font = `${data.fontStyle} ${data.fontWeight} ${data.fontSize}px ${data.fontFamily}`;
      ctx.textAlign = data.align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = data.fill;

      const lines = data.text.split('\n');
      const lineHeight = data.fontSize * 1.2;
      lines.forEach((line, index) => {
        const yOffset = (index - (lines.length - 1) / 2) * lineHeight;
        if (data.stroke && data.strokeWidth > 0) {
          ctx.lineWidth = data.strokeWidth;
          ctx.strokeStyle = data.stroke;
          ctx.strokeText(line, 0, yOffset);
        }
        ctx.fillText(line, 0, yOffset);
      });
    } else if (element.type === 'image') {
      const data = element.data as ImageElementData;
      if (data.src) {
        const img = imageCacheRef.current.get(data.src);
        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -data.width / 2, -data.height / 2, data.width, data.height);
        }
      }
    } else if (element.type === 'shape') {
      const data = element.data as ShapeElementData;
      ctx.fillStyle = data.fill;
      ctx.strokeStyle = data.stroke;
      ctx.lineWidth = data.strokeWidth;
      ctx.lineJoin = 'round';

      if (data.shape === 'rectangle') {
        ctx.fillRect(-data.width / 2, -data.height / 2, data.width, data.height);
        if (data.strokeWidth > 0) ctx.strokeRect(-data.width / 2, -data.height / 2, data.width, data.height);
      } else if (data.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, data.width / 2, 0, Math.PI * 2);
        ctx.fill();
        if (data.strokeWidth > 0) ctx.stroke();
      } else if (data.shape === 'sticker-star') {
        const spikes = 5;
        const outer = data.width / 2;
        const inner = outer * 0.4;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outer : inner;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        if (data.strokeWidth > 0) ctx.stroke();
      } else if (data.shape === 'sticker-heart') {
        const w = data.width / 2;
        const h = data.height / 2;
        ctx.beginPath();
        ctx.moveTo(-w, -h / 4);
        ctx.bezierCurveTo(-w, -h / 4 - w, 0, -h - w, 0, -h / 2);
        ctx.bezierCurveTo(0, -h - w, w, -h / 4 - w, w, -h / 4);
        ctx.bezierCurveTo(w, 0, w, h / 2, 0, h);
        ctx.bezierCurveTo(-w, h / 2, -w, 0, -w, -h / 4);
        ctx.closePath();
        ctx.fill();
        if (data.strokeWidth > 0) ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const drawSelection = (ctx: CanvasRenderingContext2D, element: DesignElement) => {
    const matrix = getElementScreenBounds(element);
    ctx.save();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#0ea5e9';
    ctx.strokeRect(matrix.x, matrix.y, matrix.width, matrix.height);
    ctx.setLineDash([]);

    ctx.fillStyle = '#fff';
    const handles = getTransformHandles(element, matrix);
    handles.forEach((handle) => {
      ctx.beginPath();
      ctx.rect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.restore();
  };

  const getElementScreenBounds = (element: DesignElement) => {
    if (element.type === 'text') {
      const data = element.data as TextElementData;
      const lines = data.text.split('\n');
      const textWidth = Math.max(...lines.map((l) => {
        const canvas = canvasRef.current;
        if (!canvas) return 0;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 0;
        ctx.font = `${data.fontStyle} ${data.fontWeight} ${data.fontSize}px ${data.fontFamily}`;
        return ctx.measureText(l).width;
      }));
      const left = data.align === 'left' ? element.x : data.align === 'right' ? element.x - textWidth * element.scaleX : element.x - textWidth * 0.5 * element.scaleX;
      return { x: left, y: element.y - (lines.length * data.fontSize * 1.2 * 0.5) * element.scaleY, width: textWidth * element.scaleX, height: lines.length * data.fontSize * 1.2 * element.scaleY };
    } else if (element.type === 'image') {
      const data = element.data as ImageElementData;
      return { x: element.x - data.width / 2 * element.scaleX, y: element.y - data.height / 2 * element.scaleY, width: data.width * element.scaleX, height: data.height * element.scaleY };
    } else {
      const data = element.data as ShapeElementData;
      return { x: element.x - data.width / 2 * element.scaleX, y: element.y - data.height / 2 * element.scaleY, width: data.width * element.scaleX, height: data.height * element.scaleY };
    }
  };

  const getTransformHandles = (element: DesignElement, bounds: { x: number; y: number; width: number; height: number }) => {
    const { x, y, width: w, height: h } = bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    return [
      { type: 'move' as const, cursor: 'grab', x: cx, y: cy },
      { type: 'corner' as const, cursor: 'nwse-resize', x, y },
      { type: 'corner' as const, cursor: 'nesw-resize', x: x + w, y },
      { type: 'corner' as const, cursor: 'nesw-resize', x, y: y + h },
      { type: 'corner' as const, cursor: 'nwse-resize', x: x + w, y: y + h },
      { type: 'rotate' as const, cursor: 'alias', x: cx, y: y - HANDLE_OFFSET },
    ];
  };

  const screenToDesign = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  };

  const hitTest = (designX: number, designY: number) => {
    const inverted = [...elements].sort((a, b) => b.z - a.z);
    for (const element of inverted) {
      const bounds = getElementScreenBounds(element);
      const radians = (-element.rotation * Math.PI) / 180;
      const dx = designX - element.x;
      const dy = designY - element.y;
      const localX = element.x + dx * Math.cos(radians) - dy * Math.sin(radians);
      const localY = element.y + dx * Math.sin(radians) + dy * Math.cos(radians);
      if (
        localX >= bounds.x - HIT_THRESHOLD &&
        localX <= bounds.x + bounds.width + HIT_THRESHOLD &&
        localY >= bounds.y - HIT_THRESHOLD &&
        localY <= bounds.y + bounds.height + HIT_THRESHOLD
      ) {
        return element;
      }
    }
    return null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = screenToDesign(event.clientX, event.clientY);
    if (!pos) return;

    if (activeTool.type !== 'select') {
      if (activeTool.type === 'text') {
        addTextElement(pos);
      } else if (activeTool.type === 'image') {
        document.getElementById('cs-file-input')?.click();
      } else if (activeTool.type === 'shape' && activeTool.shape) {
        addShapeElement(pos, activeTool.shape);
      }
      return;
    }

    const selected = elements.find((element) => element.id === selectedId);
    const screenScale = canvasRef.current
      ? width / canvasRef.current.getBoundingClientRect().width
      : 1;
    const handle = selected && !selected.locked
      ? getTransformHandles(selected, getElementScreenBounds(selected)).find((item) =>
          Math.hypot(item.x - pos.x, item.y - pos.y) <= HANDLE_SIZE * screenScale
        )
      : undefined;
    const element = handle && selected ? selected : hitTest(pos.x, pos.y);
    if (element) {
      setSelectedId(element.id);
      if (element.locked) return;
      gestureRef.current = {
        pointerId: event.pointerId,
        elementId: element.id,
        mode: handle?.type === 'corner' ? 'scale' : handle?.type === 'rotate' ? 'rotate' : 'move',
        start: pos,
        original: { ...element },
        startDistance: Math.hypot(pos.x - element.x, pos.y - element.y) || 1,
        startAngle: Math.atan2(pos.y - element.y, pos.x - element.x),
        changed: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else {
      setSelectedId(null);
    }
  };

  const addTextElement = (pos: { x: number; y: number }) => {
    const newElement: DesignElement = {
      id: `el_${Math.random().toString(36).slice(2, 9)}`,
      type: 'text',
      x: pos.x,
      y: pos.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      locked: false,
      opacity: 1,
      z: elements.reduce((highest, element) => Math.max(highest, element.z), -1) + 1,
      data: {
        text: 'Double-click to edit',
        fontFamily: fontOptions[0].value,
        fontSize: 48,
        fontWeight: 700,
        fontStyle: 'normal',
        fill: '#0f172a',
        stroke: '#0f172a',
        strokeWidth: 0,
        align: 'center',
      },
    };
    const newElements = [...elements, newElement];
    updateHistoryAndRender(newElements);
    setSelectedId(newElement.id);
  };

  const addShapeElement = (pos: { x: number; y: number }, shape: ShapeType) => {
    const size = 120;
    const newElement: DesignElement = {
      id: `el_${Math.random().toString(36).slice(2, 9)}`,
      type: 'shape',
      x: pos.x,
      y: pos.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      locked: false,
      opacity: 1,
      z: elements.reduce((highest, element) => Math.max(highest, element.z), -1) + 1,
      data: {
        shape,
        fill: '#0ea5e3',
        stroke: '#0284c7',
        strokeWidth: 2,
        width: size,
        height: size,
      },
    };
    const newElements = [...elements, newElement];
    updateHistoryAndRender(newElements);
    setSelectedId(newElement.id);
  };

  const addLibraryItem = (item: CrownStrokeLibraryItem, position = { x: width / 2, y: height / 2 }) => {
    const base = {
      id: `el_${Math.random().toString(36).slice(2, 9)}`,
      x: position.x,
      y: position.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      locked: false,
      opacity: 1,
      z: elements.reduce((highest, element) => Math.max(highest, element.z), -1) + 1,
    };
    let element: DesignElement;
    if (item.type === 'text') {
      element = {
        ...base,
        type: 'text',
        data: {
          text: item.text || item.label,
          fontFamily: fontOptions[0].value,
          fontSize: 48,
          fontWeight: 700,
          fontStyle: 'normal',
          fill: item.fill || '#26382f',
          stroke: '#26382f',
          strokeWidth: 0,
          align: 'center',
        },
      };
    } else if (item.type === 'image' && item.image) {
      const fit = Math.min(1, 360 / Math.max(item.image.width, item.image.height));
      element = {
        ...base,
        type: 'image',
        data: { ...item.image, width: item.image.width * fit, height: item.image.height * fit },
      };
    } else {
      const shape = item.shape || 'circle';
      element = {
        ...base,
        type: 'shape',
        data: {
          shape,
          fill: item.fill || '#b56d4d',
          stroke: item.stroke || '#8c5039',
          strokeWidth: 2,
          width: shape === 'rectangle' ? 180 : 140,
          height: 140,
        },
      };
    }
    const next = [...elements, element];
    updateHistoryAndRender(next);
    setSelectedId(element.id);
    setActiveTool({ type: 'select' });
  };

  const updateHistoryAndRender = (newElements: DesignElement[]) => {
    updateHistory(newElements);
    onChange(newElements);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const pos = screenToDesign(event.clientX, event.clientY);
    if (!pos) return;
    const dx = pos.x - gesture.start.x;
    const dy = pos.y - gesture.start.y;
    if (Math.hypot(dx, dy) < 1) return;
    gesture.changed = true;

    const original = gesture.original;
    const updated: DesignElement = { ...original };
    if (gesture.mode === 'move') {
      updated.x = original.x + dx;
      updated.y = original.y + dy;
    } else if (gesture.mode === 'scale') {
      const ratio = Math.max(0.08, Math.hypot(pos.x - original.x, pos.y - original.y) / gesture.startDistance);
      updated.scaleX = Math.max(0.08, original.scaleX * ratio);
      updated.scaleY = Math.max(0.08, original.scaleY * ratio);
    } else {
      const angle = Math.atan2(pos.y - original.y, pos.x - original.x);
      updated.rotation = original.rotation + ((angle - gesture.startAngle) * 180) / Math.PI;
    }
    onChange(elements.map((element) => element.id === gesture.elementId ? updated : element));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (gesture.changed) updateHistory(elements);
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/x-crownstroke-library');
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as CrownStrokeLibraryItem;
      if (!item.id || !item.label || !['text', 'shape', 'image'].includes(item.type)) return;
      const position = screenToDesign(event.clientX, event.clientY);
      if (position) addLibraryItem(item, position);
    } catch {
      // Ignore malformed or unrelated drag payloads.
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    await Promise.all(elements.flatMap((element) => {
      if (element.type !== 'image') return [];
      const image = imageCacheRef.current.get((element.data as ImageElementData).src);
      if (!image || image.complete) return [];
      return [new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      })];
    }));

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const context = exportCanvas.getContext('2d');
    if (!context) return;
    if (exportFormat === 'jpg') {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    [...elements].sort((a, b) => a.z - b.z).forEach((element) => drawElement(context, element));
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      onExport(url, exportFormat);
      setShowExport(false);
    }, `image/${exportFormat}`);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onAddImage) return;
    const file = event.target.files?.[0];
    if (file) {
      setLibraryCategory('artwork');
      setActiveTool({ type: 'select' });
      onAddImage(file);
      event.target.value = '';
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      onChange(history[prevIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onChange(history[nextIndex]);
    }
  };

  const deleteSelected = () => {
    const newElements = elements.filter((el) => el.id !== selectedId);
    updateHistoryAndRender(newElements);
    setSelectedId(null);
  };

  const bringForward = () => {
    if (!selectedId) return;
    const reordered = [...elements];
    const index = reordered.findIndex((el) => el.id === selectedId);
    if (index < reordered.length - 1) {
      [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
      const newElements = reordered.map((element, z) => ({ ...element, z }));
      updateHistoryAndRender(newElements);
    }
  };

  const sendBackward = () => {
    if (!selectedId) return;
    const reordered = [...elements];
    const index = reordered.findIndex((el) => el.id === selectedId);
    if (index > 0) {
      [reordered[index], reordered[index - 1]] = [reordered[index - 1], reordered[index]];
      const newElements = reordered.map((element, z) => ({ ...element, z }));
      updateHistoryAndRender(newElements);
    }
  };

  const updateSelectedElement = (updates: Partial<DesignElement>) => {
    if (!selectedId) return;
    const newElements = elements.map((el) => (el.id === selectedId ? { ...el, ...updates } : el));
    updateHistoryAndRender(newElements);
  };

  useEffect(() => {
    if (pendingRafRef.current) cancelAnimationFrame(pendingRafRef.current);
    pendingRafRef.current = rafRef(() => redraw());
    return () => {
      if (pendingRafRef.current) cancelAnimationFrame(pendingRafRef.current);
    };
  }, [redraw]);

  useEffect(() => {
    setHistory([elements]);
    setHistoryIndex(0);
  }, [historyResetKey]);

  useEffect(() => {
    if (selectedId && !elements.some((element) => element.id === selectedId)) setSelectedId(null);
  }, [elements, selectedId]);

  useEffect(() => {
    elements.forEach((element) => {
      if (element.type !== 'image') return;
      const { src } = element.data as ImageElementData;
      if (!src || imageCacheRef.current.has(src)) return;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => redraw();
      image.onerror = () => imageCacheRef.current.delete(src);
      imageCacheRef.current.set(src, image);
      image.src = src;
    });
  }, [elements, redraw]);

  const selectedElement = elements.find((el) => el.id === selectedId);
  const selectedType = selectedElement?.type;

  return (
      <div className={`cs-editor-shell ${readOnly ? 'is-readonly' : ''}`}>
        <div className="cs-editor-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="cs-editor-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        />
      </div>

      {!readOnly && (
        <>
          <section className="cs-editor-library" aria-label="Design library">
            <div className="cs-library-heading"><span>01 / LIBRARY</span><strong>Make it yours</strong></div>
            <div className="cs-library-tabs" role="tablist" aria-label="Library categories">
              {([
                ['text', 'Text'],
                ['shapes', 'Shapes'],
                ['artwork', 'Artwork'],
              ] as const).map(([category, label]) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={libraryCategory === category}
                  className={libraryCategory === category ? 'active' : ''}
                  onClick={() => setLibraryCategory(category)}
                >
                  {label}
                </button>
              ))}
            </div>
            {libraryCategory === 'artwork' && (
              <div className="cs-library-upload">
                <button
                  type="button"
                  onClick={() => document.getElementById('cs-file-input')?.click()}
                  disabled={!onAddImage}
                >
                  <Upload size={15} /> Upload artwork
                </button>
              </div>
            )}
            <div className="cs-library-items" role="tabpanel" aria-label={`${libraryCategory} library`}>
              {libraryItems.filter((item) => item.category === libraryCategory).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cs-library-item"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-crownstroke-library', JSON.stringify(item));
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addLibraryItem(item)}
                  aria-label={`Add ${item.label} to canvas. Drag to position it.`}
                  title="Click to add to center, or drag onto the canvas"
                >
                  <span className={`cs-library-preview is-${item.type}`}>
                    {item.type === 'image' && item.image
                      ? <img src={item.image.src} alt="" />
                      : item.type === 'text'
                        ? <span>{item.text || item.label}</span>
                        : <span>{shapeOptions.find((option) => option.value === item.shape)?.symbol || '●'}</span>}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
              {libraryCategory === 'artwork' && !libraryItems.some((item) => item.category === 'artwork' && item.type === 'image') && (
                <p className="cs-library-upload-hint">No uploads yet · use Upload artwork to add your own image.</p>
              )}
            </div>
          </section>
          <div className="cs-editor-toolbar">
            <div className="cs-toolbar-group">
              <button
                type="button"
                className={`tool-btn ${activeTool.type === 'select' ? 'active' : ''}`}
                onClick={() => setActiveTool({ type: 'select' })}
                aria-label="Select tool"
              >
                <MousePointer size={20} />
              </button>
              <button
                type="button"
                className={`tool-btn ${activeTool.type === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTool({ type: 'text' })}
                aria-label="Add text"
              >
                <Type size={20} />
              </button>
              <button
                type="button"
                className={`tool-btn ${activeTool.type === 'image' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTool({ type: 'select' });
                  document.getElementById('cs-file-input')?.click();
                }}
                aria-label="Add image"
              >
                <ImageIcon size={20} />
              </button>
            </div>

            <div className="cs-toolbar-group">
              {shapeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`tool-btn ${activeTool.type === 'shape' && activeTool.shape === opt.value ? 'active' : ''}`}
                  onClick={() => setActiveTool({ type: 'shape', shape: opt.value, shapeLabel: opt.label })}
                  aria-label={`Add ${opt.label}`}
                >
                  {opt.symbol}
                </button>
              ))}
            </div>

            <div className="cs-toolbar-group">
              <button
                type="button"
                className="tool-btn"
                onClick={() => {
                  const picker = document.createElement('input');
                  picker.type = 'color';
                  picker.value = background;
                  picker.oninput = () => onBackgroundChange(picker.value);
                  picker.style.opacity = '0';
                  picker.style.position = 'absolute';
                  document.body.appendChild(picker);
                  picker.click();
                  document.body.removeChild(picker);
                }}
                aria-label="Change background color"
                title="Background color"
              >
                <Palette size={20} />
              </button>
              <input
                id="cs-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div className="cs-toolbar-group">
              <button
                type="button"
                className="tool-btn"
                disabled={historyIndex <= 0}
                onClick={undo}
                aria-label="Undo"
              >
                <Undo2 size={20} />
              </button>
              <button
                type="button"
                className="tool-btn"
                disabled={historyIndex >= history.length - 1}
                onClick={redo}
                aria-label="Redo"
              >
                <Redo2 size={20} />
              </button>
              {selectedId && (
                <button
                  type="button"
                  className="tool-btn"
                  onClick={deleteSelected}
                  aria-label="Delete selection"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          </div>

          {selectedElement && (
            <div className="cs-editor-sidebar">
              <div className="cs-sidebar-section">
                <h4>{getElementTypeLabel(selectedType!)}</h4>
                <div className="cs-sidebar-field">
                  <label>X position</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(event) => updateSelectedElement({ x: Number(event.target.value) })}
                  />
                </div>
                <div className="cs-sidebar-field">
                  <label>Y position</label>
                  <input
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(event) => updateSelectedElement({ y: Number(event.target.value) })}
                  />
                </div>
                <div className="cs-sidebar-field">
                  <label>Rotation (degrees)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedElement.rotation}
                    onChange={(event) => updateSelectedElement({ rotation: Number(event.target.value) })}
                  />
                </div>
                <div className="cs-sidebar-field">
                  <label>Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedElement.opacity}
                    onChange={(event) => updateSelectedElement({ opacity: Number(event.target.value) })}
                  />
                </div>
                <div className="cs-sidebar-field">
                  <label>Lock element</label>
                  <button
                    type="button"
                    className={`tool-btn ${selectedElement.locked ? 'active' : ''}`}
                    onClick={() => updateSelectedElement({ locked: !selectedElement.locked })}
                  >
                    {selectedElement.locked ? <Lock size={18} /> : <Unlock size={18} />}
                  </button>
                </div>

                <div className="cs-sidebar-field">
                  <button type="button" className="cs-text-button" onClick={sendBackward}>
                    <ChevronDown size={14} /> Send backward
                  </button>
                </div>
                <div className="cs-sidebar-field">
                  <button type="button" className="cs-text-button" onClick={bringForward}>
                    <ChevronUp size={14} /> Bring forward
                  </button>
                </div>
              </div>

              {selectedType === 'text' && (
                <div className="cs-sidebar-section">
                  <h4>Text</h4>
                  <div className="cs-sidebar-field">
                    <label>Text content</label>
                    <textarea
                      rows={3}
                      value={(selectedElement.data as TextElementData).text}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), text: event.target.value } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Font family</label>
                    <select
                      value={(selectedElement.data as TextElementData).fontFamily}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), fontFamily: event.target.value } })}
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Font size</label>
                    <input
                      type="number"
                      min="8"
                      max="200"
                      value={(selectedElement.data as TextElementData).fontSize}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), fontSize: Number(event.target.value) } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Weight</label>
                    <input
                      type="range"
                      min="100"
                      max="900"
                      step="50"
                      value={(selectedElement.data as TextElementData).fontWeight}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), fontWeight: Number(event.target.value) } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Style</label>
                    <select
                      value={(selectedElement.data as TextElementData).fontStyle}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), fontStyle: event.target.value } })}
                    >
                      <option value="normal">Normal</option>
                      <option value="italic">Italic</option>
                      <option value="oblique">Oblique</option>
                    </select>
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Text color</label>
                    <input
                      type="color"
                      value={(selectedElement.data as TextElementData).fill}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), fill: event.target.value } })}
                    />
                  </div>
                  <div className="cs-color-grid">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="cs-color-swatch"
                        style={{ background: color }}
                        onClick={() => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), fill: color } })}
                        aria-label={color}
                      />
                    ))}
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Text align</label>
                    <select
                      value={(selectedElement.data as TextElementData).align}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as TextElementData), align: event.target.value as 'left' | 'center' | 'right' } })}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedType === 'image' && (
                <div className="cs-sidebar-section">
                  <h4>Image</h4>
                  <div className="cs-sidebar-field">
                    <label>Image URL</label>
                    <input
                      type="url"
                      value={(selectedElement.data as ImageElementData).src}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ImageElementData), src: event.target.value } })}
                      placeholder="Paste image URL"
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Width</label>
                    <input
                      type="number"
                      value={Math.round((selectedElement.data as ImageElementData).width)}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ImageElementData), width: Number(event.target.value) } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Height</label>
                    <input
                      type="number"
                      value={Math.round((selectedElement.data as ImageElementData).height)}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ImageElementData), height: Number(event.target.value) } })}
                    />
                  </div>
                </div>
              )}

              {selectedType === 'shape' && (
                <div className="cs-sidebar-section">
                  <h4>Shape</h4>
                  <div className="cs-sidebar-field">
                    <label>Shape type</label>
                    <select
                      value={(selectedElement.data as ShapeElementData).shape}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ShapeElementData), shape: event.target.value as ShapeType } })}
                    >
                      {shapeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Fill color</label>
                    <input
                      type="color"
                      value={(selectedElement.data as ShapeElementData).fill}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ShapeElementData), fill: event.target.value } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Stroke color</label>
                    <input
                      type="color"
                      value={(selectedElement.data as ShapeElementData).stroke}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ShapeElementData), stroke: event.target.value } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Stroke width</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={(selectedElement.data as ShapeElementData).strokeWidth}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ShapeElementData), strokeWidth: Number(event.target.value) } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Width</label>
                    <input
                      type="number"
                      value={Math.round((selectedElement.data as ShapeElementData).width)}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ShapeElementData), width: Number(event.target.value) } })}
                    />
                  </div>
                  <div className="cs-sidebar-field">
                    <label>Height</label>
                    <input
                      type="number"
                      value={Math.round((selectedElement.data as ShapeElementData).height)}
                      onChange={(event) => updateSelectedElement({ data: { ...(selectedElement.data as ShapeElementData), height: Number(event.target.value) } })}
                    />
                  </div>
                </div>
              )}

              <div className="cs-editor-actions">
                <button
                  type="button"
                  className="cs-button cs-button-accent"
                  onClick={() => setShowExport(true)}
                >
                  <Download size={16} /> Export design
                </button>
              </div>
            </div>
          )}

          {!selectedElement && !readOnly && (
            <div className="cs-editor-sidebar">
              <div className="cs-sidebar-section">
                <h4>Design</h4>
                <div className="cs-sidebar-field">
                  <label>Canvas width</label>
                  <input type="number" value={width} readOnly />
                </div>
                <div className="cs-sidebar-field">
                  <label>Canvas height</label>
                  <input type="number" value={height} readOnly />
                </div>
                <div className="cs-sidebar-field">
                  <label>Background color</label>
                  <input type="color" value={background} onChange={(event) => onBackgroundChange(event.target.value)} />
                </div>
              </div>
              <div className="cs-editor-actions">
                <button
                  type="button"
                  className="cs-button cs-button-accent"
                  onClick={() => setShowExport(true)}
                >
                  <Download size={16} /> Export design
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showExport && (
        <div className="cs-export-overlay">
          <div className="cs-export-popup">
            <h4>Export design</h4>
            <p>Choose a format to download your design as a high-resolution image.</p>
            <label>
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'png'}
                onChange={() => setExportFormat('png')}
              />
              PNG (transparent background)
            </label>
            <label>
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'jpg'}
                onChange={() => setExportFormat('jpg')}
              />
              JPG (solid background)
            </label>
            <div className="cs-export-actions">
              <button
                type="button"
                className="cs-button cs-button-ghost"
                onClick={() => setShowExport(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cs-button"
                onClick={handleExport}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getElementTypeLabel(type: DesignElementType | undefined): string {
  switch (type) {
    case 'text': return 'Text';
    case 'image': return 'Image';
    case 'shape': return 'Shape';
    default: return 'Element';
  }
}

export default DesignCanvas;
