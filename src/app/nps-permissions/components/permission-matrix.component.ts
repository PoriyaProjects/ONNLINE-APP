import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NpsPermission, NpsProfilePermission } from '../models/nps.models';

@Component({
  selector: 'app-nps-permission-matrix',
  templateUrl: './permission-matrix.component.html',
  styleUrls: ['./permission-matrix.component.scss'],
})
export class NpsPermissionMatrixComponent implements OnChanges {
  @Input() permissions: NpsPermission[];
  @Input() profilePermissions: NpsProfilePermission[];
  @Output() matrixChange = new EventEmitter<{ PermissionID: number; IsGranted: boolean }[]>();

  cols = ['name', 'grant'];
  private map = new Map<number, boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.profilePermissions && this.profilePermissions) {
      this.map.clear();
      this.profilePermissions.forEach((p) => this.map.set(p.PermissionID, p.IsGranted));
    }
  }

  isGranted(PermissionID: number): boolean {
    return !!this.map.get(PermissionID);
  }

  toggle(PermissionID: number, checked: boolean): void {
    this.map.set(PermissionID, checked);
    this.emitAll();
  }

  private emitAll(): void {
    const list: { PermissionID: number; IsGranted: boolean }[] = [];
    (this.permissions || []).forEach((p) => {
      list.push({ PermissionID: p.PermissionID, IsGranted: !!this.map.get(p.PermissionID) });
    });
    this.matrixChange.emit(list);
  }
}
