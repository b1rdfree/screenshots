import React, { ReactElement, useCallback, useEffect, useRef } from 'react'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import useCanvasMousedown from '../../hooks/useCanvasMousedown'
import useCanvasMousemove from '../../hooks/useCanvasMousemove'
import useCanvasMouseup from '../../hooks/useCanvasMouseup'
import useCursor from '../../hooks/useCursor'
import useDrawSelect from '../../hooks/useDrawSelect'
import useHistory from '../../hooks/useHistory'
import useLang from '../../hooks/useLang'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import ScreenshotsSizeColor from '../../ScreenshotsSizeColor'
import { HistoryItemEdit, HistoryItemSource, HistoryItemType } from '../../types'
import { isHit, isHitCircle } from '../utils'
import draw, { getEditedEllipseData } from './draw'
import { useGetState, useMemoizedFn } from 'ahooks'
import useCanvasKeyboardDel from '../../hooks/useCanvasDel'

export interface EllipseData {
  size: number
  color: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export enum EllipseEditType {
  Move,
  ResizeTop,
  ResizeRightTop,
  ResizeRight,
  ResizeRightBottom,
  ResizeBottom,
  ResizeLeftBottom,
  ResizeLeft,
  ResizeLeftTop
}

export interface EllipseEditData {
  type: EllipseEditType
  x1: number
  y1: number
  x2: number
  y2: number
  size: number
  color: string
  isDel: boolean
}

export default function Ellipse (): ReactElement {
  const lang = useLang()
  const [history, historyDispatcher] = useHistory()
  const [operation, operationDispatcher] = useOperation()
  const [, cursorDispatcher] = useCursor()
  const canvasContextRef = useCanvasContextRef()
  const [size, setSize, getSize] = useGetState(3)
  const cacheSizeRef = useRef<number>(3)
  const [color, setColor, getColor] = useGetState('#F6544A')
  const cacheColorRef = useRef<string>("#F6544A")
  const ellipseRef = useRef<HistoryItemSource<EllipseData, EllipseEditData> | null>(null)
  const ellipseEditRef = useRef<HistoryItemEdit<EllipseEditData, EllipseData> | null>(null)

  const checked = operation === 'Ellipse'

  const selectEllipse = useCallback(() => {
    operationDispatcher.set('Ellipse')
    cursorDispatcher.set('crosshair')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectEllipse = useCallback(() => {
    if (checked) {
      return
    }
    selectEllipse()
    historyDispatcher.clearSelect()
  }, [checked, selectEllipse, historyDispatcher])

  const onDrawSelect = useCallback(
    (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => {
      if (action.name !== 'Ellipse' || !canvasContextRef.current) {
        return
      }

      const source = action as HistoryItemSource<EllipseData, EllipseEditData>

      selectEllipse()

      const { x1, y1, x2, y2 } = getEditedEllipseData(source)

      let type = EllipseEditType.Move
      if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: (x1 + x2) / 2,
          y: y1
        })
      ) {
        type = EllipseEditType.ResizeTop
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x2,
          y: y1
        })
      ) {
        type = EllipseEditType.ResizeRightTop
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x2,
          y: (y1 + y2) / 2
        })
      ) {
        type = EllipseEditType.ResizeRight
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x2,
          y: y2
        })
      ) {
        type = EllipseEditType.ResizeRightBottom
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: (x1 + x2) / 2,
          y: y2
        })
      ) {
        type = EllipseEditType.ResizeBottom
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x1,
          y: y2
        })
      ) {
        type = EllipseEditType.ResizeLeftBottom
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x1,
          y: (y1 + y2) / 2
        })
      ) {
        type = EllipseEditType.ResizeLeft
      } else if (
        isHitCircle(canvasContextRef.current.canvas, e, {
          x: x1,
          y: y1
        })
      ) {
        type = EllipseEditType.ResizeLeftTop
      }

      const length = source.editHistory.length
      const color: string = length > 0 ? source.editHistory[length - 1].data.color : source.data.color;
      const size: number = length > 0 ? source.editHistory[length - 1].data.size : source.data.size;
      const isDel: boolean = length > 0 ? source.editHistory[length - 1].data.isDel : false;

      ellipseEditRef.current = {
        type: HistoryItemType.Edit,
        data: {
          type,
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
    [canvasContextRef, selectEllipse, historyDispatcher]
  )

  const onMousedown = useCallback(
    (e: MouseEvent) => {
      if (!checked || !canvasContextRef.current || ellipseRef.current) {
        return
      }

      const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()
      const x = e.clientX - left
      const y = e.clientY - top
      ellipseRef.current = {
        name: 'Ellipse',
        type: HistoryItemType.Source,
        data: {
          size,
          color,
          x1: x,
          y1: y,
          x2: x,
          y2: y
        },
        editHistory: [],
        draw,
        isHit
      }
    },
    [checked, size, color, canvasContextRef]
  )

  const onMousemove = useCallback(
    (e: MouseEvent) => {
      if (!checked || !canvasContextRef.current) {
        return
      }

      if (ellipseEditRef.current) {
        ellipseEditRef.current.data.x2 = e.clientX
        ellipseEditRef.current.data.y2 = e.clientY
        if (history.top !== ellipseEditRef.current) {
          ellipseEditRef.current.source.editHistory.push(ellipseEditRef.current)
          historyDispatcher.push(ellipseEditRef.current)
        } else {
          historyDispatcher.set(history)
        }
      } else if (ellipseRef.current) {
        const { left, top } = canvasContextRef.current.canvas.getBoundingClientRect()
        ellipseRef.current.data.x2 = e.clientX - left
        ellipseRef.current.data.y2 = e.clientY - top

        if (history.top !== ellipseRef.current) {
          historyDispatcher.push(ellipseRef.current)
        } else {
          historyDispatcher.set(history)
        }
      }
    },
    [checked, canvasContextRef, history, historyDispatcher]
  )

  const onMouseup = useCallback(() => {
    if (!checked) {
      return
    }

    if (ellipseRef.current) {
      historyDispatcher.clearSelect()
    }

    ellipseRef.current = null
    ellipseEditRef.current = null
  }, [checked, historyDispatcher])

  const seletedRectangleRef = useRef<HistoryItemEdit<
    EllipseEditData,
    EllipseData
  > | null>(null);
  useEffect(() => {
    const arr = history.stack
      .filter((item) => item.type === HistoryItemType.Source)
      .filter((item) => !!(item as HistoryItemSource<any, any>)?.isSelected)
      .filter(
        (item) => (item as HistoryItemSource<any, any>)?.name === "Ellipse"
      );
    if (arr.length > 0) {
      const infoRectangle = arr[0] as HistoryItemSource<
        EllipseData,
        EllipseEditData
      >;
      const length = infoRectangle.editHistory.length
      let size = length > 0 ? infoRectangle.editHistory[length - 1].data.size : infoRectangle.data.size;
      let color = length > 0 ? infoRectangle.editHistory[length - 1].data.color : infoRectangle.data.color;
      let isDel = length > 0 ? infoRectangle.editHistory[length - 1].data.isDel : false;
      let editPosition: EllipseEditData = {
        type: 0,
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
        source: arr[0] as HistoryItemSource<EllipseData, EllipseEditData>,
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
      type='ellipse'
      title={lang.operation_ellipse_title}
      icon='icon-ellipse'
      checked={checked}
      onClick={onSelectEllipse}
      option={<ScreenshotsSizeColor size={size} color={color} onSizeChange={onSize} onColorChange={onColor} />}
    />
  )
}
