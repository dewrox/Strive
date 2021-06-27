import { Canvas, IEvent, Point } from 'fabric/fabric-impl';
import _ from 'lodash';
import { objectToJson } from '../fabric-utils';
import { WhiteboardToolBase, WhiteboardToolOptions } from '../whiteboard-tool';

export default class PencilTool extends WhiteboardToolBase {
   private isDown = false;
   private lastUpdateIndex = 0;
   private throttledUpdate: _.DebouncedFunc<() => void>;
   private disposeAction: (() => void) | undefined;

   constructor() {
      super();

      this.throttledUpdate = _.throttle(this.onUpdatePath.bind(this), 1000 / 30); // 30 FPS
   }

   configureCanvas(canvas: Canvas) {
      super.configureCanvas(canvas);

      canvas.isDrawingMode = true;
      canvas.defaultCursor = 'default';
      this.lastUpdateIndex = 0;

      this.disposeAction?.();

      const handler = this.onElementAdded.bind(this);
      canvas.on('object:added', handler);

      this.disposeAction = () => {
         canvas.off('object:added', handler);
      };
   }

   dispose() {
      this.disposeAction?.();
      this.disposeAction = undefined;
   }

   applyOptions({ lineWidth, color }: WhiteboardToolOptions) {
      const canvas = this.getCanvas();

      canvas.freeDrawingBrush.width = lineWidth;
      canvas.freeDrawingBrush.color = color;
   }

   onMouseDown(): void {
      this.lastUpdateIndex = 0;
      this.isDown = true;
   }

   onMouseUp(): void {
      this.isDown = false;
      this.throttledUpdate.cancel();
   }

   onMouseMove(): void {
      this.throttledUpdate();
   }

   onUpdatePath(): void {
      if (!this.isDown) return;

      const canvas = this.getCanvas();
      const points = (canvas.freeDrawingBrush as any)._points as Point[];

      const addedPoints = points.slice(this.lastUpdateIndex);
      this.lastUpdateIndex = points.length;

      // this.emit('update', {
      //    type: 'free-drawing',
      //    color: canvas.freeDrawingBrush.color,
      //    width: canvas.freeDrawingBrush.width,
      //    appendPoints: addedPoints.map(({ x, y }) => ({ x, y })),
      // });
   }

   onElementAdded(e: IEvent) {
      if (!e.target) return;
      if (e.target.type !== 'path') return;
      if ((e.target as any).id) return;

      this.emit('update', { type: 'add', object: objectToJson(e.target) });
   }
}
