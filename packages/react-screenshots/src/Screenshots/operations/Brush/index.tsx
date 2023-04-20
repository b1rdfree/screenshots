import React, { ReactElement, useCallback, useEffect, useRef } from 'react'
import useCanvasMousedown from '../../hooks/useCanvasMousedown'
import useCanvasMousemove from '../../hooks/useCanvasMousemove'
import useCanvasMouseup from '../../hooks/useCanvasMouseup'
import ScreenshotsButton from '../../ScreenshotsButton'
import ScreenshotsSizeColor from '../../ScreenshotsSizeColor'
import useCursor from '../../hooks/useCursor'
import useOperation from '../../hooks/useOperation'
import useHistory from '../../hooks/useHistory'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import { HistoryItemEdit, HistoryItemSource, HistoryItemType, Point } from '../../types'
import useDrawSelect from '../../hooks/useDrawSelect'
import { isHit } from '../utils'
import draw from './draw'
import useLang from '../../hooks/useLang'
import { useGetState, useMemoizedFn } from 'ahooks'
import useCanvasKeyboardDel from '../../hooks/useCanvasDel'

export interface BrushData {
  size: number
  color: string
  points: Point[]
}

export interface BrushEditData {
  x1: number
  y1: number
  x2: number
  y2: number
  size: number
  color: string
  isDel: boolean
}

export default function Brush (): ReactElement {
  const lang = useLang()
  const [, cursorDispatcher] = useCursor()
  const [operation, operationDispatcher] = useOperation()
  const canvasContextRef = useCanvasContextRef()
  const [history, historyDispatcher] = useHistory()
  const [size, setSize, getSize] = useGetState(3)
  const cacheSizeRef = useRef<number>(3)
  const [color, setColor, getColor] = useGetState('#F6544A')
  const cacheColorRef = useRef<string>("#F6544A")
  const brushRef = useRef<HistoryItemSource<BrushData, BrushEditData> | null>(null)
  const brushEditRef = useRef<HistoryItemEdit<BrushEditData, BrushData> | null>(null)

  const checked = operation === 'Brush'

  const selectBrush = useCallback(() => {
    operationDispatcher.set('Brush')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectBrush = useCallback(() => {
    if (checked) {
      return
    }
    selectBrush()
    historyDispatcher.clearSelect()
  }, [checked, selectBrush, historyDispatcher])

  const onDrawSelect = useCallback(
    (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => {
      if (action.name !== 'Brush') {
        return
      }

      selectBrush()

      const source = action as HistoryItemSource<BrushData, BrushEditData>
      const length = source.editHistory.length
      const color: string = length > 0 ? source.editHistory[length - 1].data.color : source.data.color;
      const size: number = length > 0 ? source.editHistory[length - 1].data.size : source.data.size;
      const isDel: boolean = length > 0 ? source.editHistory[length - 1].data.isDel : false;

      brushEditRef.current = {
        type: HistoryItemType.Edit,
        data: {
          x1: e.clientX,
          y1: e.clientY,
          x2: e.clientX,
          y2: e.clientY,
          color,
          size,
          isDel
        },
        source
      }

      historyDispatcher.select(action)
    },
    [selectBrush, historyDispatcher]
  )

  const onMousedown = useCallback(
    (e: MouseEvent): void => {
      if (!checked || brushRef.current || !canvasContextRef.current) {
        return
      }

      const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()

      brushRef.current = {
        name: 'Brush',
        type: HistoryItemType.Source,
        data: {
          size,
          color,
          points: [
            {
              x: e.clientX - left,
              y: e.clientY - top
            }
          ]
        },
        editHistory: [],
        draw,
        isHit
      }
    },
    [checked, canvasContextRef, size, color]
  )

  const onMousemove = useCallback(
    (e: MouseEvent): void => {
      if (!checked || !canvasContextRef.current) {
        return
      }

      if (brushEditRef.current) {
        brushEditRef.current.data.x2 = e.clientX
        brushEditRef.current.data.y2 = e.clientY
        if (history.top !== brushEditRef.current) {
          brushEditRef.current.source.editHistory.push(brushEditRef.current)
          historyDispatcher.push(brushEditRef.current)
        } else {
          historyDispatcher.set(history)
        }
      } else if (brushRef.current) {
        const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()

        brushRef.current.data.points.push({
          x: e.clientX - left,
          y: e.clientY - top
        })

        if (history.top !== brushRef.current) {
          historyDispatcher.push(brushRef.current)
        } else {
          historyDispatcher.set(history)
        }
      }
    },
    [checked, history, canvasContextRef, historyDispatcher]
  )

  const onMouseup = useCallback((): void => {
    if (!checked) {
      return
    }

    if (brushRef.current) {
      historyDispatcher.clearSelect()
    }

    brushRef.current = null
    brushEditRef.current = null
  }, [checked, historyDispatcher])

  const seletedRectangleRef = useRef<HistoryItemEdit<
    BrushEditData,
    BrushData
  > | null>(null);
  useEffect(() => {
    const arr = history.stack
      .filter((item) => item.type === HistoryItemType.Source)
      .filter((item) => !!(item as HistoryItemSource<any, any>)?.isSelected)
      .filter(
        (item) => (item as HistoryItemSource<any, any>)?.name === "Brush"
      );
    if (arr.length > 0) {
      const infoRectangle = arr[0] as HistoryItemSource<
        BrushData,
        BrushEditData
      >;
      const length = infoRectangle.editHistory.length
      let size = length > 0 ? infoRectangle.editHistory[length - 1].data.size : infoRectangle.data.size;
      let color = length > 0 ? infoRectangle.editHistory[length - 1].data.color : infoRectangle.data.color;
      let isDel = length > 0 ? infoRectangle.editHistory[length - 1].data.isDel : false;
      let editPosition: BrushEditData = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        color: color,
        size: size,
        isDel: isDel
      };

      seletedRectangleRef.current = {
        type: HistoryItemType.Edit,
        data: JSON.parse(JSON.stringify(editPosition)),
        source: arr[0] as HistoryItemSource<BrushData, BrushEditData>,
      };
      setSize(editPosition.size)
      setColor(editPosition.color)
    } else {
      seletedRectangleRef.current = null;
      setSize(cacheSizeRef.current)
      setColor(cacheColorRef.current)
    }
  }, [history]);

  const onSize = useMemoizedFn((size: number) => {
    if (getSize() === size) return;
    setSize(size);

    if (!checked) return;
    if (seletedRectangleRef.current) {
      seletedRectangleRef.current.data.size = size;
      seletedRectangleRef.current.source.editHistory.push(
        seletedRectangleRef.current
      );
      historyDispatcher.push(seletedRectangleRef.current);
    } else {
      cacheSizeRef.current = size
    }
  });

  const onColor = useMemoizedFn((color: string) => {
    if (getColor() === color) return;
    setColor(color);

    if (!checked) return;
    if (seletedRectangleRef.current) {
      seletedRectangleRef.current.data.color = color;
      seletedRectangleRef.current.source.editHistory.push(
        seletedRectangleRef.current
      );
      historyDispatcher.push(seletedRectangleRef.current);
    } else {
      cacheColorRef.current = color
    }
  });

  const onDel = useMemoizedFn(() => { 
    if (!checked) return;
    if (seletedRectangleRef.current) {
      seletedRectangleRef.current.data.isDel = true
      seletedRectangleRef.current.source.editHistory.push(seletedRectangleRef.current)
      historyDispatcher.push(seletedRectangleRef.current)
      setTimeout(() => {
        historyDispatcher.clearSelect()
      }, 50);
    }
  })

  useDrawSelect(onDrawSelect)
  useCanvasMousedown(onMousedown)
  useCanvasMousemove(onMousemove)
  useCanvasMouseup(onMouseup)
  useCanvasKeyboardDel(onDel)

  return (
    <ScreenshotsButton
      type='brush'
      title={lang.operation_brush_title}
      icon='icon-brush'
      checked={checked}
      onClick={onSelectBrush}
      option={<ScreenshotsSizeColor size={size} color={color} onSizeChange={onSize} onColorChange={onColor} />}
    />
  )
}
