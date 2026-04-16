import { HARD_FALLBACK_DEPARTMENT_GROUP_MAPPING } from '../constants/department-group-mapping';
import { DepartmentGroupMapping } from '../models/department.model';

export function getGroupForDepartment(dept: string): { deptGroupId: number; deptGroupName: string } | null {
    const mapped = HARD_FALLBACK_DEPARTMENT_GROUP_MAPPING.find(m => m.deptName === dept);
    if (mapped) {
        return {
            deptGroupId: mapped.deptGroupId,
            deptGroupName: mapped.deptGroupName
        };
    }
    return null;
}