import {  Component,  ViewChild,  ViewContainerRef,  ComponentFactoryResolver} from '@angular/core';
import { GroupDashboardComponent } from './group-dashboard.component';

@Component({
  selector: 'app-hospital-income-dashb',
  templateUrl: './hospital-income-dashb.component.html',
  styleUrls: ['./hospital-income-dashb.component.scss']
})
export class HospitalIncomeDashbComponent {
  deptGroups: string[] = ['Finance', 'IT', 'HR', 'Marketing'];

  

  @ViewChild('groupHost', { read: ViewContainerRef, static: true })
groupHost!: ViewContainerRef;

constructor(private resolver: ComponentFactoryResolver) {}


loadGroupDashboard(groupName: string): void {
  this.groupHost.clear();
  const factory = this.resolver.resolveComponentFactory(GroupDashboardComponent);
  const cmpRef = this.groupHost.createComponent(factory);
  cmpRef.instance.groupName = groupName;
}


}


