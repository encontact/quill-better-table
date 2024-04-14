import Quill from "quill"
import Block from "quill/blots/block"
import Container from "quill/blots/container"
import Break from "quill/blots/break"
import { InlineBlot, EmbedBlot } from 'parchment';

import { getRelativeRect } from '../utils'
import Header from './header'

Quill.import("blots/break")
Quill.import('blots/block')
Quill.import("blots/container")

const COL_ATTRIBUTES = ["width"]
const COL_DEFAULT = {
  width: 100
}
const CELL_IDENTITY_KEYS = ["row", "cell"]
const CELL_ATTRIBUTES = ["rowspan", "colspan"]
const CELL_DEFAULT = {
  rowspan: 1,
  colspan: 1
}
const ERROR_LIMIT = 5

class TableCellLine extends Block {
  static create(value: any) : any {
    const node = super.create(value)

    CELL_IDENTITY_KEYS.forEach(key => {
      let identityMaker = key === 'row'
        ? rowId : cellId
      node.setAttribute(`data-${key}`, value[key] || identityMaker())
    })

    CELL_ATTRIBUTES.forEach((attrName: string) => {
      type ObjectKey = keyof typeof CELL_DEFAULT;
      const attribute = attrName as ObjectKey;
      node.setAttribute(`data-${attrName}`, value[attrName] || CELL_DEFAULT[attribute])
    })

    if (value['cell-bg']) {
      node.setAttribute('data-cell-bg', value['cell-bg'])
    }

    return node
  }

  static formats(domNode: any) : any {
    const formats = {}

    return CELL_ATTRIBUTES.concat(CELL_IDENTITY_KEYS).concat(['cell-bg']).reduce((formats: any, attribute: string) => {
      if (domNode.hasAttribute(`data-${attribute}`)) {
        formats[attribute] = domNode.getAttribute(`data-${attribute}`) || undefined
      }
      return formats
    }, formats)
  }

  format(name: any, value: any) {
    if (CELL_ATTRIBUTES.concat(CELL_IDENTITY_KEYS).indexOf(name) > -1) {
      if (value) {
        this.domNode.setAttribute(`data-${name}`, value)
      } else {
        this.domNode.removeAttribute(`data-${name}`)
      }
    } else if (name === 'cell-bg') {
      if (value) {
        this.domNode.setAttribute('data-cell-bg', value)
      } else {
        this.domNode.removeAttribute('data-cell-bg')
      }
    } else if (name === 'header') {
      if (!value) return;
      const { row, cell, rowspan, colspan } = TableCellLine.formats(this.domNode)
      super.format(name, {
        value,
        row,
        cell,
        rowspan,
        colspan
      })
    } else {
      super.format(name, value)
    }
  }

  optimize(context: any) : void {
    // cover shadowBlot's wrap call, pass params parentBlot initialize
    // needed
    const rowId = this.domNode.getAttribute('data-row')
    const rowspan = this.domNode.getAttribute('data-rowspan')
    const colspan = this.domNode.getAttribute('data-colspan')
    const cellBg = this.domNode.getAttribute('data-cell-bg')
    if (this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)) {
      this.wrap(this.statics.requiredContainer.blotName, {
        row: rowId,
        colspan,
        rowspan,
        'cell-bg': cellBg
      })
    }
    super.optimize(context)
  }

  tableCell() {
    return this.parent
  }
}
TableCellLine.blotName = "table-cell-line"
TableCellLine.className = "qlbt-cell-line"
TableCellLine.tagName = "P"

class TableCell extends Container {
  checkMerge() : boolean {
    if (super.checkMerge() && this.next?.children.head != null) {
      // The conversion to InlineBlot is necessary because the formats method not exists on Blot interface.
      const thisHead = (this.children?.head as InlineBlot).formats()[this.children.head?.statics?.blotName || '']
      const thisTail = (this.children?.tail as InlineBlot).formats()[this.children.tail?.statics?.blotName || '']
      const nextHead = (this.next?.children?.head as InlineBlot).formats()[this.next.children.head.statics.blotName]
      const nextTail = (this.next?.children?.tail as InlineBlot).formats()[this.next.children.tail?.statics?.blotName || '']
      return (
        thisHead.cell === thisTail.cell &&
        thisHead.cell === nextHead.cell &&
        thisHead.cell === nextTail.cell
      )
    }
    return false
  }

  static create(value: any) : any {
    const node = super.create(value) as any
    node.setAttribute("data-row", value.row)

    CELL_ATTRIBUTES.forEach(attrName => {
      if (value[attrName]) {
        node.setAttribute(attrName, value[attrName])
      }
    })

    if (value['cell-bg']) {
      node.setAttribute('data-cell-bg', value['cell-bg'])
      node.style.backgroundColor = value['cell-bg']
    }

    return node
  }

  static formats(domNode: any) : any {
    const formats = { row: '', 'cell-bg': '' }

    if (domNode.hasAttribute("data-row")) {
      formats["row"] = domNode.getAttribute("data-row")
    }

    if (domNode.hasAttribute("data-cell-bg")) {
      formats["cell-bg"] = domNode.getAttribute("data-cell-bg")
    }

    return CELL_ATTRIBUTES.reduce((formats: any, attribute: string) => {
      if (domNode.hasAttribute(attribute)) {
        formats[attribute] = domNode.getAttribute(attribute)
      }

      return formats
    }, formats)
  }

  cellOffset() : number {
    if (this.parent) {
      return this.parent.children.indexOf(this)
    }
    return -1
  }

  formats() : any {
    const formats = { row: '', 'cell-bg': '' }

    if (this.domNode.hasAttribute("data-row")) {
      formats["row"] = this.domNode.getAttribute("data-row") || ''
    }

    if (this.domNode.hasAttribute("data-cell-bg")) {
      formats["cell-bg"] = this.domNode.getAttribute("data-cell-bg") || ''
    }

    return CELL_ATTRIBUTES.reduce((formats: any, attribute: string) => {
      if (this.domNode.hasAttribute(attribute)) {
        formats[attribute] = this.domNode.getAttribute(attribute)
      }

      return formats
    }, formats)
  }

  toggleAttribute (name: string, value: string) : void {
    if (value) {
      this.domNode.setAttribute(name, value)
    } else {
      this.domNode.removeAttribute(name)
    }
  }

  formatChildren (name: string, value: any) : void {
    this.children.forEach(child => {
      // Cat to EmbedBlot because the "format" method not exists on Blot interface with this parameters.
      (child as EmbedBlot).format(name, value)
    })
  }

  format(name: string, value: any) : void {
    if (CELL_ATTRIBUTES.indexOf(name) > -1) {
      this.toggleAttribute(name, value)
      this.formatChildren(name, value)
    } else if (['row'].indexOf(name) > -1) {
      this.toggleAttribute(`data-${name}`, value)
      this.formatChildren(name, value)
    } else if (name === 'cell-bg') {
      this.toggleAttribute('data-cell-bg', value)
      this.formatChildren(name, value)

      if (value) {
        this.domNode.style.backgroundColor = value
      } else {
        this.domNode.style.backgroundColor = 'initial'
      }
    } else {
    //// Using formatAt instead format because not found ideal way to format the TableCellLine.
    //   super.format(name, value)
      super.formatAt(0, 0, name, value)
    }
  }

  optimize(context: any) : void {
    const rowId = this.domNode.getAttribute("data-row")

    if (this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)) {
      this.wrap(this.statics.requiredContainer.blotName, {
        row: rowId
      })
    }
    super.optimize(context)
  }

  row() : any {
    return this.parent
  }

  rowOffset() : number {
    if (this.row()) {
      return this.row().rowOffset()
    }
    return -1
  }

  table() : any {
    return this.row() && this.row().table()
  }
}
TableCell.blotName = "table"
TableCell.tagName = "TD"

class TableRow extends Container {
  checkMerge() : boolean {
    if (super.checkMerge() && this.next?.children.head != null) {
      // The conversion to InlineBlot is necessary because the formats method not exists on Blot interface.
      const thisHead = (this.children?.head as InlineBlot).formats()
      const thisTail = (this.children?.tail as InlineBlot).formats()
      const nextHead = (this.next.children?.head as InlineBlot).formats()
      const nextTail = (this.next.children?.tail as InlineBlot).formats()

      return (
        thisHead.row === thisTail.row &&
        thisHead.row === nextHead.row &&
        thisHead.row === nextTail.row
      )
    }
    return false
  }

  static create(value: any) : any {
    const node = super.create(value) as any
    node.setAttribute("data-row", value.row)
    return node
  }

  formats() : any {
    return ["row"].reduce((formats: any, attrName: string) : any => {
      if (this.domNode.hasAttribute(`data-${attrName}`)) {
        formats[attrName] = this.domNode.getAttribute(`data-${attrName}`)
      }
      return formats
    }, {})
  }

  optimize (context: any) {
    // optimize function of ShadowBlot
    if (
      this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)
    ) {
      this.wrap(this.statics.requiredContainer.blotName)
    }

    // optimize function of ParentBlot
    // note: modified this optimize function because
    // TableRow should not be removed when the length of its children was 0
    this.enforceAllowedChildren()
    if (this.uiNode != null && this.uiNode !== this.domNode.firstChild) {
      this.domNode.insertBefore(this.uiNode, this.domNode.firstChild)
    }

    // optimize function of ContainerBlot
    if (this.children.length > 0 && this.next != null && this.checkMerge()) {
      this.next.moveChildren(this)
      this.next.remove()
    }
  }

  rowOffset() : number {
    if (this.parent) {
      return this.parent.children.indexOf(this)
    }
    return -1
  }

  table() : any {
    return this.parent && this.parent.parent
  }
}
TableRow.blotName = "table-row"
TableRow.tagName = "TR"

class TableBody extends Container {}
TableBody.blotName = "table-body"
TableBody.tagName = "TBODY"

class TableCol extends Block {
  static create (value: any) : any {
    let node = super.create(value)
    COL_ATTRIBUTES.forEach((attrName: string) => {
      type ObjectKey = keyof typeof COL_DEFAULT;
      const attribute = attrName as ObjectKey;
      node.setAttribute(`${attrName}`, value[attrName] || COL_DEFAULT[attribute])
    })
    return node
  }

  static formats(domNode: any) : any {
    return COL_ATTRIBUTES.reduce((formats: any, attribute: string) => {
      if (domNode.hasAttribute(`${attribute}`)) {
        formats[attribute] =
          domNode.getAttribute(`${attribute}`) || undefined
      }
      return formats
    }, {})
  }

  format(name: string, value: any) {
    if (COL_ATTRIBUTES.indexOf(name) > -1) {
      type ObjectKey = keyof typeof COL_DEFAULT;
      const attribute = name as ObjectKey;
      this.domNode.setAttribute(`${name}`, value || COL_DEFAULT[attribute])
    } else {
      super.format(name, value)
    }
  }

  html () {
    return this.domNode.outerHTML
  }
}
TableCol.blotName = "table-col"
TableCol.tagName = "col"

class TableColGroup extends Container {}
TableColGroup.blotName = "table-col-group"
TableColGroup.tagName = "colgroup"

class TableContainer extends Container {
  static create() : any{
    let node = super.create()
    return node
  }

  constructor (scroll: any, domNode: any) {
    super(scroll, domNode)
    this.updateTableWidth()
  }

  updateTableWidth () : void {
    setTimeout(() : void => {
      const colGroup = this.colGroup()
      if (!colGroup) return
      const tableWidth = colGroup.children.reduce((sumWidth: number, col: InlineBlot) => {
        sumWidth = sumWidth + parseInt(col.formats()[TableCol.blotName].width, 10)
        return sumWidth
      }, 0)
      this.domNode.style.width = `${tableWidth}px`
    }, 0)
  }

  cells(column: number): any {
    return this.rows().map(row => row.children.at(column))
  }

  colGroup () : InlineBlot {
    return this.children.head as InlineBlot
  }

  deleteColumns(compareRect: any, delIndexes = [], editorWrapper: any) {
    const [body] = this.descendants(TableBody)
    if (body == null || body.children.head == null) return

    const tableCells = this.descendants(TableCell)
    const removedCells: TableCell[] = []
    const modifiedCells: TableCell[] = []

    tableCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (
        cellRect.x + ERROR_LIMIT > compareRect.x &&
        cellRect.x1 - ERROR_LIMIT < compareRect.x1
      ) {
        removedCells.push(cell)
      } else if (
        cellRect.x < compareRect.x + ERROR_LIMIT &&
        cellRect.x1 > compareRect.x1 - ERROR_LIMIT
      ) {
        modifiedCells.push(cell)
      }
    })

    if (removedCells.length === tableCells.length) {
      this.tableDestroy()
      return true
    }

    // remove the matches column tool cell
    delIndexes.forEach(() => {
      this.colGroup().children.at(delIndexes[0])?.remove()
    })

    removedCells.forEach(cell => {
      cell.remove()
    })

    modifiedCells.forEach(cell => {
      const cellColspan = parseInt(cell.formats().colspan, 10)
    //// Commented because not used anywhere.
    //   const cellWidth = parseInt(cell.formats().width, 10)
      cell.format('colspan', cellColspan - delIndexes.length)
    })

    this.updateTableWidth()
  }

  deleteRow(compareRect: any, editorWrapper: any) {
    const [body] = this.descendants(TableBody)
    if (body == null || body.children.head == null) return

    const tableCells = this.descendants(TableCell)
    const tableRows = this.descendants(TableRow)
    const removedCells: TableCell[] = []  // cells to be removed
    const modifiedCells: TableCell[] = [] // cells to be modified
    const fallCells: TableCell[] = []     // cells to fall into next row

    // compute rows to remove
    // bugfix: #21 There will be a empty tr left if delete the last row of a table
    const removedRows = tableRows.filter(row => {
      const rowRect = getRelativeRect(
        row.domNode.getBoundingClientRect(),
        editorWrapper
      )
      
      return rowRect.y > compareRect.y - ERROR_LIMIT &&
        rowRect.y1 < compareRect.y1 + ERROR_LIMIT
    })

    tableCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (
        cellRect.y > compareRect.y - ERROR_LIMIT &&
        cellRect.y1 < compareRect.y1 + ERROR_LIMIT
      ) {
        removedCells.push(cell)
      } else if (
        cellRect.y < compareRect.y + ERROR_LIMIT &&
        cellRect.y1 > compareRect.y1 - ERROR_LIMIT
      ) {
        modifiedCells.push(cell)

        if (Math.abs(cellRect.y - compareRect.y) < ERROR_LIMIT) {
          fallCells.push(cell)
        }
      }
    })

    if (removedCells.length === tableCells.length) {
      this.tableDestroy()
      return
    }

    // compute length of removed rows
    const removedRowsLength = this.rows().reduce((sum, row) => {
      let rowRect  = getRelativeRect(
        row.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (
        rowRect.y > compareRect.y - ERROR_LIMIT &&
        rowRect.y1 < compareRect.y1 + ERROR_LIMIT
      ) {
        sum += 1
      }
      return sum
    }, 0)

    // it must excute before the table layout changed with other operation
    fallCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )
      const nextRow = cell.parent.next as InlineBlot
      const cellsInNextRow = nextRow.children

      const refCell = cellsInNextRow.reduce((ref: any, compareCell: TableCell) : any => {
        const compareRect = getRelativeRect(
          compareCell.domNode.getBoundingClientRect(),
          editorWrapper
        )
        if (Math.abs(cellRect.x1 - compareRect.x) < ERROR_LIMIT) {
          ref = compareCell
        }
        return ref
      }, null)

      nextRow.insertBefore(cell, refCell)
      cell.format('row', nextRow.formats().row)
    })

    removedCells.forEach(cell => {
      cell.remove()
    })

    modifiedCells.forEach(cell => {
      const cellRowspan = parseInt(cell.formats().rowspan, 10)
      cell.format("rowspan", cellRowspan - removedRowsLength)
    })

    // remove selected rows
    removedRows.forEach(row => row.remove())
  }

  tableDestroy() : void {
    const quill = Quill.find(this.scroll.domNode.parentNode as HTMLElement) as Quill
    const tableModule = quill.getModule("better-table") as any
    this.remove()
    tableModule.hideTableTools()
    quill.update(Quill.sources.USER)
  }

  insertCell(tableRow: TableRow, ref: any) : void {
    const id = cellId()
    const rId = tableRow.formats().row
    const tableCell = this.scroll.create(
      TableCell.blotName,
      Object.assign({}, CELL_DEFAULT, {
        row: rId
      })
    ) as TableCell
    const cellLine = this.scroll.create(TableCellLine.blotName, {
      row: rId,
      cell: id
    })
    tableCell.appendChild(cellLine)

    if (ref) {
      tableRow.insertBefore(tableCell, ref)
    } else {
      tableRow.appendChild(tableCell)
    }
  }

  insertColumn(compareRect: any, colIndex: number, isRight: boolean = true, editorWrapper: any) : TableCell[] {
    const [body] = this.descendants(TableBody)
    const [tableColGroup] = this.descendants(TableColGroup)
    const tableCols = this.descendants(TableCol)
    let addAsideCells: TableCell[] = []
    let modifiedCells: TableCell[] = []
    let affectedCells: TableCell[] = []

    if (body == null || body.children.head == null) return []
    const tableCells = this.descendants(TableCell)
    tableCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (isRight) {
        if (Math.abs(cellRect.x1 - compareRect.x1) < ERROR_LIMIT) {
          // the right of selected boundary equal to the right of table cell,
          // add a new table cell right aside this table cell
          addAsideCells.push(cell)
        } else if (
          compareRect.x1 - cellRect.x > ERROR_LIMIT &&
          compareRect.x1 - cellRect.x1 < -ERROR_LIMIT
        ) {
          // the right of selected boundary is inside this table cell
          // colspan of this table cell will increase 1
          modifiedCells.push(cell)
        }
      } else {
        if (Math.abs(cellRect.x - compareRect.x) < ERROR_LIMIT) {
          // left of selected boundary equal to left of table cell,
          // add a new table cell left aside this table cell
          addAsideCells.push(cell)
        } else if (
          compareRect.x - cellRect.x > ERROR_LIMIT &&
          compareRect.x - cellRect.x1 < -ERROR_LIMIT
        ) {
          // the left of selected boundary is inside this table cell
          // colspan of this table cell will increase 1
          modifiedCells.push(cell)
        }
      }
    })

    addAsideCells.forEach(cell => {
      const ref = isRight ? cell.next : cell
      const id = cellId()
      const tableRow = cell.parent as TableRow
      const rId = tableRow.formats().row
      const cellFormats = cell.formats()
      const tableCell = this.scroll.create(
        TableCell.blotName,
        Object.assign({}, CELL_DEFAULT, {
          row: rId,
          rowspan: cellFormats.rowspan
        })
      ) as TableCell
      const cellLine = this.scroll.create(TableCellLine.blotName, {
        row: rId,
        cell: id,
        rowspan: cellFormats.rowspan
      })
      tableCell.appendChild(cellLine)

      if (ref) {
        tableRow.insertBefore(tableCell, ref)
      } else {
        tableRow.appendChild(tableCell)
      }
      affectedCells.push(tableCell)
    })

    // insert new tableCol
    const tableCol = this.scroll.create(TableCol.blotName, true)
    let colRef = isRight ? tableCols[colIndex].next : tableCols[colIndex]
    if (colRef) {
      tableColGroup.insertBefore(tableCol, colRef)
    } else {
      tableColGroup.appendChild(tableCol)
    }

    modifiedCells.forEach(cell => {
      const cellColspan = cell.formats().colspan
      cell.format('colspan', parseInt(cellColspan, 10) + 1)
      affectedCells.push(cell)
    })

    affectedCells.sort((cellA, cellB) => {
      let y1 = cellA.domNode.getBoundingClientRect().y
      let y2 = cellB.domNode.getBoundingClientRect().y
      return y1 - y2
    })

    this.updateTableWidth()
    return affectedCells
  }

  insertRow(compareRect: any, isDown: boolean, editorWrapper: any) {
    const [body] = this.descendants(TableBody)
    if (body == null || body.children.head == null) return

    const tableCells = this.descendants(TableCell)
    const rId = rowId()
    const newRow = this.scroll.create(TableRow.blotName, {
      row: rId
    }) as TableRow
    let addBelowCells: TableCell[] = []
    let modifiedCells: TableCell[] = []
    let affectedCells: TableCell[] = []

    tableCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (isDown) {
        if (Math.abs(cellRect.y1 - compareRect.y1) < ERROR_LIMIT) {
          addBelowCells.push(cell)
        } else if (
          compareRect.y1 - cellRect.y > ERROR_LIMIT &&
          compareRect.y1 - cellRect.y1 < -ERROR_LIMIT
        ) {
          modifiedCells.push(cell)
        }
      } else {
        if (Math.abs(cellRect.y - compareRect.y) < ERROR_LIMIT) {
          addBelowCells.push(cell)
        } else if (
          compareRect.y - cellRect.y > ERROR_LIMIT &&
          compareRect.y - cellRect.y1 < -ERROR_LIMIT
        ) {
          modifiedCells.push(cell)
        }
      }
    })

    // ordered table cells with rect.x, fix error for inserting
    // new table cell in complicated table with wrong order.
    const sortFunc = (cellA: TableCell, cellB: TableCell): number => {
      let x1 = cellA.domNode.getBoundingClientRect().x
      let x2 = cellB.domNode.getBoundingClientRect().x
      return x1 - x2
    }
    addBelowCells.sort(sortFunc)

    addBelowCells.forEach(cell => {
      const cId = cellId()
      const cellFormats = cell.formats()

      const tableCell = this.scroll.create(TableCell.blotName, Object.assign(
        {}, CELL_DEFAULT, { row: rId, colspan: cellFormats.colspan }
      )) as TableCell
      const cellLine = this.scroll.create(TableCellLine.blotName, {
        row: rId,
        cell: cId,
        colspan: cellFormats.colspan
      }) as any
      const empty = this.scroll.create(Break.blotName)
      cellLine.appendChild(empty)
      tableCell.appendChild(cellLine)
      newRow.appendChild(tableCell)
      affectedCells.push(tableCell)
    })

    modifiedCells.forEach(cell => {
      const cellRowspan = parseInt(cell.formats().rowspan, 10)
      cell.format("rowspan", cellRowspan + 1)
      affectedCells.push(cell)
    })

    const refRow = this.rows().find(row => {
      let rowRect = getRelativeRect(
        row.domNode.getBoundingClientRect(),
        editorWrapper
      )
      if (isDown) {
        return Math.abs(rowRect.y - compareRect.y - compareRect.height) < ERROR_LIMIT
      } else {
        return Math.abs(rowRect.y - compareRect.y) < ERROR_LIMIT
      }
    })
    body.insertBefore(newRow, refRow)

    // reordering affectedCells
    affectedCells.sort(sortFunc)
    return affectedCells
  }

  mergeCells (compareRect: any, mergingCells: TableCell[], rowspan: any, colspan: any, editorWrapper: any) : TableCell | null {
    const mergedCell = mergingCells.reduce((result: TableCell, tableCell, index) : TableCell => {
      if (index !== 0) {
        result && tableCell.moveChildren(result)
        tableCell.remove()
      } else {
        tableCell.format('colspan', colspan)
        tableCell.format('rowspan', rowspan)
        result = tableCell
      }

      return result
    }, null)

    if(mergedCell === null) return null

    let rowId = mergedCell.domNode.getAttribute('data-row')
    let cellId = (mergedCell.children.head?.domNode as any).getAttribute('data-cell')
    mergedCell.children.forEach((cellLine: InlineBlot) => {
      cellLine.format('cell', cellId)
      cellLine.format('row', rowId)
      cellLine.format('colspan', colspan)
      cellLine.format('rowspan', rowspan)
    })

    return mergedCell
  }

  unmergeCells (unmergingCells: TableCell[], editorWrapper: any) {
    let cellFormats = { row: '', cell: '', rowspan: 1, colspan: 1 }
    let cellRowspan = 1
    let cellColspan = 1

    unmergingCells.forEach(tableCell => {
      cellFormats = tableCell.formats()
      cellRowspan = cellFormats.rowspan
      cellColspan = cellFormats.colspan

      if (cellColspan > 1) {
        let ref = tableCell.next
        let row = tableCell.row()
        tableCell.format('colspan', 1)
        for (let i = cellColspan; i > 1; i--) {
          this.insertCell(row, ref)
        }
      }

      if (cellRowspan > 1) {
        let i = cellRowspan
        let nextRow = tableCell.row().next
        while (i > 1) {
          let refInNextRow = nextRow.children
            .reduce((result: TableCell, cell: TableCell) => {
              let compareRect = getRelativeRect(
                tableCell.domNode.getBoundingClientRect(),
                editorWrapper
              )
              let cellRect = getRelativeRect(
                cell.domNode.getBoundingClientRect(),
                editorWrapper
              )
              if (Math.abs(compareRect.x1 - cellRect.x) < ERROR_LIMIT) {
                result = cell
              }
              return result
            }, null)

          for (let i = cellColspan; i > 0; i--) {
            this.insertCell(nextRow, refInNextRow)
          }

          i -= 1
          nextRow = nextRow.next
        }

        tableCell.format('rowspan', 1)
      }
    })
  }

  rows() : InlineBlot[] {
    const body = this.children.tail as InlineBlot
    if (body == null) return []
    return body.children.map((row: InlineBlot) => row)
  }
}
TableContainer.blotName = "table-container"
TableContainer.className = "quill-better-table"
TableContainer.tagName = "TABLE"

class TableViewWrapper extends Container {
  constructor (scroll: any, domNode: any) {
    super(scroll, domNode)
    const quill = Quill.find(scroll.domNode.parentNode) as Quill
    domNode.addEventListener('scroll', (e: any) => {
      // Inputed as any because the type was not exists when updating this code.
      const tableModule = quill.getModule('better-table') as any
      if (tableModule.columnTool) {
        tableModule.columnTool.domNode.scrollLeft = e.target.scrollLeft
      }

      if (tableModule.tableSelection &&
        tableModule.tableSelection.selectedTds.length > 0) {
        tableModule.tableSelection.repositionHelpLines()
      }
    }, false)
  }

  table () {
    return this.children.head
  }
}
TableViewWrapper.blotName = "table-view"
TableViewWrapper.className = "quill-better-table-wrapper"
TableViewWrapper.tagName = "DIV"

TableViewWrapper.allowedChildren = [TableContainer]
TableContainer.requiredContainer = TableViewWrapper

TableContainer.allowedChildren = [TableBody, TableColGroup]
TableBody.requiredContainer = TableContainer

TableBody.allowedChildren = [TableRow]
TableRow.requiredContainer = TableBody

TableRow.allowedChildren = [TableCell]
TableCell.requiredContainer = TableRow

TableCell.allowedChildren = [TableCellLine, Header]
TableCellLine.requiredContainer = TableCell

TableColGroup.allowedChildren = [TableCol]
TableColGroup.requiredContainer = TableContainer

TableCol.requiredContainer = TableColGroup


function rowId() : string {
  const id = Math.random()
    .toString(36)
    .slice(2, 6)
  return `row-${id}`
}

function cellId() : string {
  const id = Math.random()
    .toString(36)
    .slice(2, 6)
  return `cell-${id}`
}

export {
  // blots
  TableCol,
  TableColGroup,
  TableCellLine,
  TableCell,
  TableRow,
  TableBody,
  TableContainer,
  TableViewWrapper,

  // identity getters
  rowId,
  cellId,

  // attributes
  CELL_IDENTITY_KEYS,
  CELL_ATTRIBUTES
}
