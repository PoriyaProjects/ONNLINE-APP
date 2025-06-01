import { Component } from '@angular/core';

@Component({
  selector: 'app-role-config',
  templateUrl: './role-config.component.html',
  styleUrls: ['./role-config.component.scss']
})
export class RoleConfigComponent {
  selectedRole = 'Viewer';
  permissions = {
    Viewer: ['read'],
    Admin: ['read', 'write', 'configure'],
    Finance: ['read', 'export']
  };

  updateRolePermissions() {
    console.log(`Updated permissions for ${this.selectedRole}`);
  }
}