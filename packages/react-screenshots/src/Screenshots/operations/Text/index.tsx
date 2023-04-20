import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import useCanvasContextRef from '../../hooks/useCanvasContextRef'
import useCanvasMousedown from '../../hooks/useCanvasMousedown'
import useCursor from '../../hooks/useCursor'
import useHistory from '../../hooks/useHistory'
import useOperation from '../../hooks/useOperation'
import ScreenshotsButton from '../../ScreenshotsButton'
import ScreenshotsSizeColor from '../../ScreenshotsSizeColor'
import {
  HistoryItemEdit,
  HistoryItemSource,
  HistoryItemType,
  Point
} from '../../types'
import ScreenshotsTextarea from '../../ScreenshotsTextarea'
import useBounds from '../../hooks/useBounds'
import useDrawSelect from '../../hooks/useDrawSelect'
import useCanvasMousemove from '../../hooks/useCanvasMousemove'
import useCanvasMouseup from '../../hooks/useCanvasMouseup'
import useLang from '../../hooks/useLang'
import { useGetState, useMemoizedFn } from 'ahooks'
import useDoubleClick from '../../hooks/useDoubleClick'
import useCanvasKeyboardDel from '../../hooks/useCanvasDel'

export interface TextData {
  size: number;
  color: string;
  fontFamily: string;
  x: number;
  y: number;
  text: string;
  isShow: boolean
}

export interface TextEditData {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  size: number
  color: string
  text: string
  isDel: boolean
}

export interface TextareaBounds {
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
}

const sizes: Record<number, number> = {
  3: 18,
  6: 32,
  9: 46,
  18: 3,
  32: 6,
  46: 9
}

function getText(info: HistoryItemSource<TextData, TextEditData>) {
  const textHistory = info.editHistory;
  const historyLength = textHistory.length;
  const sourceText = info.data.text;

  if (historyLength > 0) {
    const isDel = textHistory[historyLength - 1].data.isDel;
    if (isDel) {
      return "";
    } else {
      return textHistory[historyLength - 1].data.text;
    }
  } else {
    return sourceText;
  }
}

function draw (
  ctx: CanvasRenderingContext2D,
  action: HistoryItemSource<TextData, TextEditData>
) {
  const { size, color, fontFamily, x, y, text, isShow } = action.data

  if(!isShow) return

  let setSize = size
  let setColor = color
  let setText = text
  let isDel = false

  for(let {data} of action.editHistory){
    setSize = data.size ? data.size : setSize
    setColor = data.color ? data.color : setColor
    setText = data.text
    isDel = data.isDel
  }

  if(isDel) return

  ctx.fillStyle = setColor
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = `${setSize}px ${fontFamily}`

  const distance = action.editHistory.reduce(
    (distance, { data }) => ({
      x: distance.x + data.x2 - data.x1,
      y: distance.y + data.y2 - data.y1
    }),
    { x: 0, y: 0 }
  )

  let width = 0
  let height = 0

  setText.split('\n').forEach((item, index) => {
    const measured = ctx.measureText(item)
    if (width < measured.width) {
      width = measured.width
    }
    height += setSize

    ctx.fillText(item, x + distance.x, y + distance.y + index * setSize)
  })

  if(action.isSelected) {
    let wrapperX = x + distance.x
    let wrapperY = y + distance.y

    ctx.lineCap = 'butt'
    ctx.lineJoin = 'miter'
    ctx.lineWidth = 1
    ctx.strokeStyle = "#000000"

    ctx.beginPath()
    ctx.moveTo(wrapperX - 2, wrapperY - 2)
    ctx.lineTo(wrapperX + width + 2, wrapperY - 2)
    ctx.lineTo(wrapperX + width + 2, wrapperY + height + 2)
    ctx.lineTo(wrapperX - 2, wrapperY + height + 2)
    ctx.closePath()
    ctx.stroke()
  }
}

function isHit (
  ctx: CanvasRenderingContext2D,
  action: HistoryItemSource<TextData, TextEditData>,
  point: Point
) {
  let setSize = action.data.size
  for(let item of action.editHistory) setSize = item.data.size
  let setText = getText(action)
  
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = `${setSize}px ${action.data.fontFamily}`

  let width = 0
  let height = 0

  setText.split('\n').forEach((item) => {
    const measured = ctx.measureText(item)
    if (width < measured.width) {
      width = measured.width
    }
    height += setSize
  })

  const { x, y } = action.editHistory.reduce(
    (distance, { data }) => ({
      x: distance.x + data.x2 - data.x1,
      y: distance.y + data.y2 - data.y1
    }),
    { x: 0, y: 0 }
  )

  const left = action.data.x + x
  const top = action.data.y + y
  const right = left + width
  const bottom = top + height

  return (
    point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
  )
}

export default function Text (): ReactElement {
  const lang = useLang()
  const [history, historyDispatcher] = useHistory()
  const [bounds] = useBounds()
  const [operation, operationDispatcher] = useOperation()
  const [, cursorDispatcher] = useCursor()
  const canvasContextRef = useCanvasContextRef()
  const [size, setSize, getSize] = useGetState(3)
  const cacheSizeRef = useRef<number>(3)
  const [color, setColor, getColor] = useGetState('#F6544A')
  const cacheColorRef = useRef<string>("#F6544A")
  const textRef = useRef<HistoryItemSource<TextData, TextEditData> | null>(
    null
  )
  const textEditRef = useRef<HistoryItemEdit<TextEditData, TextData> | null>(
    null
  )
  const [textareaBounds, setTextareaBounds] = useState<TextareaBounds | null>(
    null
  )
  const [text, setText] = useState<string>('')

  const mouseXYRef = useRef<number[]>([0,0])
  const seletedRectangleRef = useRef<HistoryItemEdit<
    TextEditData,
    TextData
  > | null>(null);

  const checked = operation === 'Text'

  const selectText = useCallback(() => {
    operationDispatcher.set('Text')
    cursorDispatcher.set('default')
  }, [operationDispatcher, cursorDispatcher])

  const onSelectText = useCallback(() => {
    if (checked) {
      return
    }
    selectText()
    historyDispatcher.clearSelect()
  }, [checked, selectText, historyDispatcher])

  const onTextareaChange = useCallback(
    (value: string) => {
      setText(value)
      if (checked && textRef.current) {
        textRef.current.data.text = value
      }
      if(checked && textEditRef.current){
        textEditRef.current.data.text = value
      }
    },
    [checked]
  )

  const onTextareaBlur = useCallback((e: any) => {
    /**
     * 注释代码逻辑
     * 补充编辑模式下能进行颜色和字体大小的修改
     * 有问题，暂未开放
     */
    // if(!bounds) return
    // const {x, y, width, height} = bounds
    // if (
    //   mouseXYRef.current[0] < x ||
    //   mouseXYRef.current[1] < y ||
    //   mouseXYRef.current[0] > x + width ||
    //   mouseXYRef.current[1] > y + height
    // ) {
    //   return;
    // }
    
    if (textRef.current && textRef.current.data.text) {
      historyDispatcher.push(textRef.current)
    }
    if(textEditRef.current){
      if(!textEditRef.current.data.text) textEditRef.current.data.isDel = true
      textEditRef.current.source.data.isShow = true
      textEditRef.current.source.editHistory.push(textEditRef.current)
      historyDispatcher.push(textEditRef.current);
    }
    textRef.current = null
    textEditRef.current = null
    setText('')
    setTextareaBounds(null)
    setTimeout(() => {
      historyDispatcher.clearSelect()
    }, 10);
  }, [historyDispatcher])

  const onDrawSelect = useCallback(
    (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => {
      if (action.name !== 'Text') {
        return
      }

      if(textareaBounds) return
      
      selectText()

      const source = action as HistoryItemSource<TextData, TextEditData>
      const length = source.editHistory.length
      const color: string = length > 0 ? source.editHistory[length - 1].data.color : source.data.color;
      const size: number = length > 0 ? source.editHistory[length - 1].data.size : source.data.size;
      const text = getText(source)

      textEditRef.current = {
        type: HistoryItemType.Edit,
        data: {
          x1: e.clientX,
          y1: e.clientY,
          x2: e.clientX,
          y2: e.clientY,
          color,
          size,
          text: text,
          isDel: false
        },
        source
      }

      historyDispatcher.select(action)
    },
    [selectText, textareaBounds, historyDispatcher]
  )

  const onDoubleClick = useCallback(
    (action: HistoryItemSource<unknown, unknown>, e: MouseEvent) => {
      if (!checked || !canvasContextRef.current || !bounds) {
        return
      }

      if (action.name !== 'Text') {
        return
      }

      selectText()

      const { left, top } =
          canvasContextRef.current.canvas.getBoundingClientRect();

      const source = action as HistoryItemSource<TextData, TextEditData>
      const length = source.editHistory.length
      const color: string = length > 0 ? source.editHistory[length - 1].data.color : source.data.color;
      const size: number = length > 0 ? source.editHistory[length - 1].data.size : source.data.size;
      const text = getText(source)
      
      const distance = source.editHistory.reduce(
        (distance, { data }) => ({
          x: distance.x + data.x2 - data.x1,
          y: distance.y + data.y2 - data.y1
        }),
        { x: 0, y: 0 }
      )
      const boundX = source.data.x + distance.x 
      const boundY = source.data.y + distance.y 

      textEditRef.current = {
        type: HistoryItemType.Edit,
        data: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
          color,
          size,
          text: text,
          isDel: false
        },
        source
      }

      setText(text)
      source.data.isShow = false
      historyDispatcher.set(history)

      setTextareaBounds({
        x: boundX + left,
        y: boundY + top,
        maxWidth: bounds.width - boundX,
        maxHeight: bounds.height - boundY,
      });
    },
    [selectText, historyDispatcher]
  )

  const onMousedown = useCallback(
    (e: MouseEvent) => {
      if (!checked || !canvasContextRef.current || textRef.current || !bounds) {
        return
      }
      
      if (seletedRectangleRef.current) {
        historyDispatcher.clearSelect();
      } else {
        const { left, top } =
          canvasContextRef.current.canvas.getBoundingClientRect();
        const fontFamily = window.getComputedStyle(
          canvasContextRef.current.canvas
        ).fontFamily;
        const x = e.clientX - left;
        const y = e.clientY - top;

        textRef.current = {
          name: "Text",
          type: HistoryItemType.Source,
          data: {
            size: sizes[size],
            color,
            fontFamily,
            x,
            y,
            text: "",
            isShow: true
          },
          editHistory: [],
          draw,
          isHit,
        };

        setTextareaBounds({
          x: e.clientX,
          y: e.clientY,
          maxWidth: bounds.width - x,
          maxHeight: bounds.height - y,
        });
      }
    },
    [checked, size, color, bounds, canvasContextRef]
  )

  const onMousemove = useCallback(
    (e: MouseEvent): void => {
      mouseXYRef.current = [e.clientX || 0, e.clientY || 0]
      if (!checked) {
        return
      }

      if (textEditRef.current && !textareaBounds) {
        textEditRef.current.data.x2 = e.clientX
        textEditRef.current.data.y2 = e.clientY
        if (history.top !== textEditRef.current) {
          textEditRef.current.source.editHistory.push(textEditRef.current)
          historyDispatcher.push(textEditRef.current)
        } else {
          historyDispatcher.set(history)
        }
      }
    },
    [checked, history, textareaBounds, historyDispatcher]
  )

  const onMouseup = useCallback((): void => {
    if (!checked) {
      return
    }

    if(!textareaBounds){
      textEditRef.current = null
    }
  }, [checked, textareaBounds])

  useEffect(() => {
    const arr = history.stack
      .filter((item) => item.type === HistoryItemType.Source)
      .filter((item) => !!(item as HistoryItemSource<any, any>)?.isSelected)
      .filter(
        (item) => (item as HistoryItemSource<any, any>)?.name === "Text"
      );
      
    if (arr.length > 0) {
      const infoRectangle = arr[0] as HistoryItemSource<
        TextData,
        TextEditData
      >;
      const length = infoRectangle.editHistory.length
      let size = length > 0 ? infoRectangle.editHistory[length - 1].data.size : infoRectangle.data.size;
      let color = length > 0 ? infoRectangle.editHistory[length - 1].data.color : infoRectangle.data.color;
      let text = getText(infoRectangle)
      let editPosition: TextEditData = {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        color: color,
        size: size,
        text: text,
        isDel: false
      };

      seletedRectangleRef.current = {
        type: HistoryItemType.Edit,
        data: JSON.parse(JSON.stringify(editPosition)),
        source: arr[0] as HistoryItemSource<TextData, TextEditData>,
      };
      setSize(sizes[editPosition.size])
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
      seletedRectangleRef.current.data.size = sizes[size];
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
    if(textareaBounds && textEditRef.current) {
      return
    } 

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
  useDoubleClick(onDoubleClick)
  useCanvasKeyboardDel(onDel)

  return (
    <>
      <ScreenshotsButton
        type='text'
        title={lang.operation_text_title}
        icon='icon-text'
        checked={checked}
        onClick={onSelectText}
        option={
          <ScreenshotsSizeColor
            size={size}
            color={color}
            onSizeChange={onSize}
            onColorChange={onColor}
          />
        }
      />
      {checked && textareaBounds && (
        <ScreenshotsTextarea
          x={textareaBounds.x}
          y={textareaBounds.y}
          maxWidth={textareaBounds.maxWidth}
          maxHeight={textareaBounds.maxHeight}
          size={sizes[size]}
          color={color}
          value={text}
          onChange={onTextareaChange}
          onBlur={onTextareaBlur}
        />
      )}
    </>
  )
}
