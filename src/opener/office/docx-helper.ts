import type Editor from "@hufe921/canvas-editor";
import { ListType, RowFlex } from "@hufe921/canvas-editor";

// 未完成

export default {
    undo: session => session.command.executeUndo(),
    redo: session => session.command.executeRedo(),
    fontFamily: (session, value) => session.command.executeFont(value),
    fontSize: (session, value) => session.command.executeSize(value),
    addFontSize: session => session.command.executeSizeAdd(),
    minFontSize: session => session.command.executeSizeMinus(),
    bold: session => session.command.executeBold(),
    italic: session => session.command.executeItalic(),
    underline: session => session.command.executeUnderline(),
    strikeout: session => session.command.executeStrikeout(),
    superScript: session => session.command.executeSuperscript(),
    subScript: session => session.command.executeSubscript(),
    color: (session, value) => session.command.executeColor(value),
    highlight: (session, value) => session.command.executeHighlight(value),
    alignLeft: session => session.command.executeRowFlex(RowFlex.LEFT),
    alignCenter: session => session.command.executeRowFlex(RowFlex.CENTER),
    alignRight: session => session.command.executeRowFlex(RowFlex.RIGHT),
    alignJustify: session => session.command.executeRowFlex(RowFlex.JUSTIFY),
    addUList: session => session.command.executeList(ListType.UL),
    addOList: session => session.command.executeList(ListType.OL),
    // addTable: session => session.command.table(),
} as Record<string, (this: HTMLElement, editor: Editor, value?: any) => void>;