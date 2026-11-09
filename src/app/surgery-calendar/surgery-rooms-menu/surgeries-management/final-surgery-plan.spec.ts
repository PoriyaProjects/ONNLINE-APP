import { of } from 'rxjs';
import { SurgeriesManagementComponent } from './surgeries-management.component';

describe('Final surgery plan PDF', () => {
  function render(rows: any[], rooms: any[]): { html: string; post: jasmine.Spy } {
    const component: any = Object.create(SurgeriesManagementComponent.prototype);
    component.specificRooms = rooms;
    component.viewDate = new Date(2026, 10, 5);
    component.data = { room: { CalendarRoomsArea: 'area' } };
    component.datePipe = { transform: () => '2026-11-05' };
    const post = jasmine.createSpy('post').and.returnValue(of({ d: rows }));
    component.http = { post };
    component.openShareDialog = jasmine.createSpy('openShareDialog');
    component.sentDepartmentFinalSurgeryPlan('department', 'room-1');
    return { html: component.openShareDialog.calls.mostRecent().args[0], post };
  }

  it('uses the existing board data for each matching case and room', () => {
    const result = render([
      { casenumber: '001234', room: 'room-1', s_name: 'first' },
      { casenumber: '005678', room: 'room-1', s_name: 'second' },
      { casenumber: '000999', room: 'room-1', s_name: 'third' },
    ], [
      { roomName: 'room-1', Surgeries: [
        { SurgeryPatientDetails: { PM_CASE_NUMBER: '1234' }, AdditionalDetails: { LAP_OR_OPEN: 'Robot' } },
        { SurgeryPatientDetails: { PM_CASE_NUMBER: '5678' }, AdditionalDetails: { LAP_OR_OPEN: 'Open & <Lap>' } },
      ] },
      { roomName: 'room-2', Surgeries: [
        { SurgeryPatientDetails: { PM_CASE_NUMBER: '999' }, AdditionalDetails: { LAP_OR_OPEN: 'wrong room' } },
      ] },
    ]);

    expect(result.post.calls.count()).toBe(1);
    expect(result.html).toContain('<th>LAP_OR_OPEN</th>');
    expect(result.html).toContain('<td> first </td>\n                                <td> Robot </td>');
    expect(result.html).toContain('<td> second </td>\n                                <td> Open &amp; &lt;Lap&gt; </td>');
    expect(result.html).toContain('<td> third </td>\n                                <td>  </td>');
    expect(result.html).not.toContain('wrong room');
  });

  it('does not assign a value from an ambiguous case and accepts the report value', () => {
    const result = render([
      { casenumber: '123', s_name: 'ambiguous' },
      { casenumber: '456', s_name: 'fallback', LAP_OR_OPEN: 'Open' },
    ], [
      { roomName: 'room-1', Surgeries: [
        { SurgeryPatientDetails: { PM_CASE_NUMBER: '123' }, AdditionalDetails: { LAP_OR_OPEN: 'Robot' } },
        { SurgeryPatientDetails: { PM_CASE_NUMBER: '123' }, AdditionalDetails: { LAP_OR_OPEN: 'Lap' } },
      ] },
    ]);

    expect(result.html).toContain('<td> ambiguous </td>\n                                <td>  </td>');
    expect(result.html).toContain('<td> fallback </td>\n                                <td> Open </td>');
  });
});
