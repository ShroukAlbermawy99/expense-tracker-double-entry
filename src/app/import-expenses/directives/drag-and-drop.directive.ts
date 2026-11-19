import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appDragAndDrop]',
})

/* @HostBinding:
   You can bind to various host element properties, including:
   HTML attributes: class, src, id
   CSS styles: style.width, style.height, style.color
   Standard properties: href, title, placeholder */

/* The dragover event is fired continuously when a dragged element or selection of text is moved over a valid drop target. */
/* The dragleave event is fired when a dragged element or text selection leaves a valid drop target. */

export class DragAndDropDirective {
  @HostBinding('class.file-over') fileOver!: boolean;
  @Output() fileDropped = new EventEmitter<FileList>();

  @HostListener('dragover', ['$event']) onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = true;
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
  }

  @HostListener('drop', ['$event']) public ondrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
    const files = evt?.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileDropped.emit(files);
    }
  }
}
/*  Feature	     addEventListener (React)	                                                @HostListener (Angular)
    Usage	       Imperative, standard browser API	                                        Declarative, Angular-specific decorator
    Cleanup	     Manual cleanup required in useEffect return function	                    Automatic cleanup handled by Angular
    Context	     Works on any DOM element	                                                Listens on the host element of a component or directive
    Syntax	     Callback function passed to addEventListener	                            Decorator on a method with event name and optional arguments
    Target	     Can target any DOM element (window, document, or specific element refs)	Primarily targets the host element, but can target window and document as well
    Framework	   Framework-agnostic, standard JS	                                        Angular-specific 
*/