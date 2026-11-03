import { Component, type FunctionComponent, forwardRef } from 'react'
import type { LayoutChangeEvent, View } from 'react-native'

export interface PanelProps {
  /** Panel title. */
  title?: string
  count?: number
  onLayout?: (event: LayoutChangeEvent) => void
}
export const FunctionPanel: FunctionComponent<PanelProps> = () => null
export class ClassPanel extends Component<PanelProps> {
  render() {
    return null
  }
}
export const ForwardPanel = forwardRef<View, PanelProps>(() => null)

export const RequiredPanel: FunctionComponent<{
  title: string
  onLayout?: PanelProps['onLayout']
}> = () => null
