import React, { cloneElement, memo, ReactElement, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ScreenshotsOperationsCtx } from '../ScreenshotsOperations'
import { Point } from '../types'
import './index.less'
import { useGetState } from 'ahooks'
import useStore from '../hooks/useStore'

export interface ScreenshotsOptionProps {
  type: string;
  open?: boolean
  content?: ReactNode
  children: ReactElement
}

export type Position = Point

export enum Placement {
  Bottom = 'bottom',
  Top = 'top'
}

export default memo(function ScreenshotsOption ({ type, open, content, children }: ScreenshotsOptionProps): ReactElement {
  const { width: bodyWidth, height: bodyHeight } = useStore()
  const childrenRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const operationsRect = useContext(ScreenshotsOperationsCtx)
  const [placement, setPlacement, getPlacement] = useGetState<Placement>(Placement.Bottom)
  const [position, setPosition, getPosition] = useGetState<Position | null>(null)
  const [offsetX, setOffsetX] = useState<number>(0)

  const getPopoverEl = () => {
    if (!popoverRef.current) {
      popoverRef.current = document.createElement('div')
    }
    return popoverRef.current
  }

  useEffect(() => {
    const $el = getPopoverEl()
    if (open) {
      document.body.appendChild($el)
    }
    return () => {
      $el.remove()
    }
  }, [open])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || !operationsRect || !childrenRef.current || !contentRef.current) {
      return
    }

    let timer: any = null
    if (getPosition()) setPosition(null);
    setOffsetX(0)

    // 截图功能按钮框的高
    const opWrapperHeight = 45;
    // 截图功能按钮的尺寸(正方形)
    const ButtonSize = 28
    // 截图字体颜色框的中心偏移距离(距离左边界的距离)
    const OptionWrapperLeft = 107
    // 马赛克功能字体框的中心偏移距离(距离左边界的距离)
    const MosaicWrapperLeft = 50
    // 截图字体颜色框的宽和高
    const OptionWrapperWidth = 315
    const OptionWrapperHeight = 37
    // 截图字体颜色框的修饰箭头高度
    const OptionArrowHeight = 8

    const {x: opX, y: opY, width: opWidth, height: opHeight, position: opPosition} = operationsRect

    // 判断字体颜色选择器的装饰器朝向
    let optionPlacement = Placement.Bottom;
    if (opY < OptionArrowHeight + OptionWrapperHeight) {
      optionPlacement = Placement.Bottom;
    }
    if (
      bodyHeight - opY - opWrapperHeight <
      OptionArrowHeight + OptionWrapperHeight
    ) {
      optionPlacement = Placement.Top;
    }
    if (
      opY > OptionArrowHeight + OptionWrapperHeight &&
      bodyHeight - opY - opWrapperHeight >
        OptionArrowHeight + OptionWrapperHeight
    ) {
      optionPlacement = opPosition
        ? opPosition === "top"
          ? Placement.Top
          : Placement.Bottom
        : optionPlacement;
    }

    const childrenRect = childrenRef.current.getBoundingClientRect()

    const {x: childX, y: childY} = childrenRect

    let positionX: number = 0
    let positionY: number = 0

    // 计算字体颜色选择器的坐标位置
    positionX = childX + ButtonSize/2 - OptionWrapperLeft
    positionY =
      optionPlacement === Placement.Top
        ? opY - OptionWrapperHeight - OptionArrowHeight
        : opY + opWrapperHeight + OptionArrowHeight;
    if(type === "mosaic") {
      positionX = childX + ButtonSize/2 - MosaicWrapperLeft
    }
    if(positionX < OptionWrapperLeft && positionX <= opX) {
      let offset = opX - positionX
      // 稍微减少
      positionX = opX
      setOffsetX(offset)
    }
    
    timer = setTimeout(() => {
      if(getPlacement() !== optionPlacement) {
        setPlacement(optionPlacement)
      }
      setPosition({
        x:positionX,
        y:positionY
      })
    }, 100);     
      
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, operationsRect, childrenRef.current, type])

  return (
    <>
      {cloneElement(children, {
        ref: childrenRef
      })}
      {open &&
        content &&
        createPortal(
          <div
            ref={contentRef}
            className='screenshots-option'
            style={{
              visibility: position ? 'visible' : 'hidden',
              transform: `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px)`
            }}
            data-placement={placement}
          >
            <div className='screenshots-option-container'>{content}</div>
            <div className='screenshots-option-arrow' style={type === "mosaic" ? { marginLeft: 13 } : { marginLeft: -offsetX}}/>
          </div>,
          getPopoverEl()
        )}
    </>
  )
})
