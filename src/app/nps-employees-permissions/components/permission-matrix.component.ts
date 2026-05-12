import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NpsPermission, NpsPermissionCard, NpsProfilePermission } from '../models/nps.models';

@Component({
  selector: 'app-nps-permission-matrix',
  templateUrl: './permission-matrix.component.html',
  styleUrls: ['./permission-matrix.component.scss'],
})
export class NpsPermissionMatrixComponent implements OnChanges {
  @Input() permissions: NpsPermission[];
  @Input() permissionCards: NpsPermissionCard[];
  @Input() profilePermissions: NpsProfilePermission[];
  @Input() preferCards = false;
  @Output() matrixChange = new EventEmitter<{ PermissionID: number; IsGranted: boolean }[]>();

  cols = ['name', 'grant'];
  private map = new Map<number, boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.profilePermissions || changes.permissionCards) {
      this.rebuildMapFromInputs();
    }
  }

  private rebuildMapFromInputs(): void {
    this.map.clear();
    if (this.profilePermissions && this.profilePermissions.length) {
      this.profilePermissions.forEach((p) => this.map.set(p.PermissionID, p.IsGranted));
      return;
    }
    (this.permissionCards || []).forEach((card) =>
      (card.Permissions || []).forEach((perm) => this.map.set(perm.PermissionID, !!perm.IsGranted))
    );
  }

  isGranted(PermissionID: number): boolean {
    return !!this.map.get(PermissionID);
  }

  toggle(PermissionID: number, checked: boolean): void {
    this.map.set(PermissionID, checked);
    this.emitAll();
  }

  isCardAllSelected(card: NpsPermissionCard): boolean {
    const rows = card?.Permissions || [];
    if (!rows.length) {
      return false;
    }
    return rows.every((row) => this.isGranted(row.PermissionID));
  }

  isCardPartiallySelected(card: NpsPermissionCard): boolean {
    const rows = card?.Permissions || [];
    if (!rows.length) {
      return false;
    }
    const selectedCount = rows.reduce((acc, row) => acc + (this.isGranted(row.PermissionID) ? 1 : 0), 0);
    return selectedCount > 0 && selectedCount < rows.length;
  }

  toggleCard(card: NpsPermissionCard, checked: boolean): void {
    const rows = card?.Permissions || [];
    rows.forEach((row) => this.map.set(row.PermissionID, checked));
    this.emitAll();
  }

  trackCard(index: number, card: NpsPermissionCard): string {
    return `${card.ActionID}_${card.ActionSubject || ''}_${index}`;
  }

  private emitAll(): void {
    const ids = this.permissionCards && this.permissionCards.length
      ? this.permissionCards.reduce((acc: number[], card) => {
          (card.Permissions || []).forEach((perm) => acc.push(perm.PermissionID));
          return acc;
        }, [])
      : (this.permissions || []).map((p) => p.PermissionID);
    const uniqueIds = Array.from(new Set(ids));
    const list: { PermissionID: number; IsGranted: boolean }[] = [];
    uniqueIds.forEach((permissionID) => {
      list.push({ PermissionID: permissionID, IsGranted: !!this.map.get(permissionID) });
    });
    this.matrixChange.emit(list);
  }
}
