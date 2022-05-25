/* eslint-disable react/no-unused-prop-types */

import {CloseIcon} from '@sanity/icons'
import {
  Box,
  Button,
  Container,
  Flex,
  Popover,
  PopoverProps,
  PortalProvider,
  Text,
  useBoundaryElement,
  useClickOutside,
  useElementRect,
  useLayer,
  usePortal,
} from '@sanity/ui'
import React, {useCallback, useEffect, useMemo, useState} from 'react'
import styled from 'styled-components'
import {PresenceOverlay} from '../../../../../presence'
import {FIXME} from '../../../../types'
import {POPOVER_WIDTH_TO_UI_WIDTH} from './constants'
import {debugElement} from './debug'
import {ModalWidth} from './types'

interface PopoverEditDialogProps {
  children: React.ReactNode
  elementRef: React.MutableRefObject<HTMLElement | null>
  onClose: () => void
  scrollElement: HTMLElement
  title: string | React.ReactNode
  width?: ModalWidth
}

const RootPopover = styled(Popover)`
  &[data-popper-reference-hidden='true'] {
    visibility: hidden;
    pointer-events: none;
  }

  & > div {
    overflow: hidden;
  }
`

const ContentContainer = styled(Container)`
  &:not([hidden]) {
    display: flex;
  }
  direction: column;
`

const ContentScrollerBox = styled(Box)`
  /* Prevent overflow caused by change indicator */
  overflow-x: hidden;
  overflow-y: auto;
`

const ContentHeaderBox = styled(Box)`
  background-color: var(--card-bg-color);
  box-shadow: 0 1px 0 var(--card-shadow-outline-color);
  position: relative;
  z-index: 10;
  min-height: auto;
`

const POPOVER_FALLBACK_PLACEMENTS: PopoverProps['fallbackPlacements'] = ['top', 'bottom']

export function PopoverEditDialog(props: PopoverEditDialogProps) {
  const {width, elementRef, scrollElement} = props
  const [forceUpdate, setForceUpdate] = useState(0)
  const virtualElement = useMemo(() => {
    if (!elementRef?.current?.getBoundingClientRect()) {
      return null
    }

    return {
      contextElement: elementRef.current || undefined,
      getBoundingClientRect: () => {
        return elementRef.current?.getBoundingClientRect() || null
      },
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementRef, forceUpdate])

  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)
  const boundaryElement = useBoundaryElement()
  const boundaryElementRect = useElementRect(boundaryElement.element)

  const contentStyle: React.CSSProperties = useMemo(
    () => ({
      opacity: boundaryElementRect ? undefined : 0,
      width: boundaryElementRect ? `${boundaryElementRect.width - 16}px` : undefined,
    }),

    [boundaryElementRect]
  )

  const handleScrollOrResize = useCallback(() => {
    setForceUpdate(forceUpdate + 1)
  }, [forceUpdate])

  useEffect(() => {
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScrollOrResize, true)
    }
    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', handleScrollOrResize, true)
      }
    }
  }, [handleScrollOrResize, scrollElement])

  return (
    <RootPopover
      constrainSize
      content={<Content {...props} rootElement={rootElement} style={contentStyle} width={width} />}
      fallbackPlacements={POPOVER_FALLBACK_PLACEMENTS}
      placement="bottom"
      open
      portal="default"
      ref={setRootElement}
      referenceElement={virtualElement || (debugElement as FIXME)}
    />
  )
}

function Content(
  props: PopoverEditDialogProps & {
    rootElement: HTMLDivElement | null
    style: React.CSSProperties
  }
) {
  const {onClose, rootElement, style, width = 'small', title} = props
  const {isTopLayer} = useLayer()
  const {element: boundaryElement} = useBoundaryElement()
  const portal = usePortal()

  const handleClose = useCallback(() => {
    if (isTopLayer) onClose()
  }, [isTopLayer, onClose])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    },
    [handleClose]
  )

  useClickOutside(handleClose, [rootElement], boundaryElement)

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <ContentContainer style={style} width={POPOVER_WIDTH_TO_UI_WIDTH[width]}>
      <Flex direction="column" flex={1}>
        <ContentHeaderBox padding={1}>
          <Flex align="center">
            <Box flex={1} padding={2}>
              <Text weight="semibold">{title}</Text>
            </Box>

            <Button icon={CloseIcon} mode="bleed" onClick={handleClose} padding={2} />
          </Flex>
        </ContentHeaderBox>
        <ContentScrollerBox flex={1}>
          <PresenceOverlay margins={[0, 0, 1, 0]}>
            <Box padding={3}>
              <PortalProvider element={portal.elements?.default}>{props.children}</PortalProvider>
            </Box>
          </PresenceOverlay>
        </ContentScrollerBox>
      </Flex>
    </ContentContainer>
  )
}
