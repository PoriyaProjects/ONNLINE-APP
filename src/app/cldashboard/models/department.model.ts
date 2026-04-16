// models/department.model.ts
export interface Department {
    id: number;
    name: string;
  }


  export interface DepartmentGroupMapping {
    deptName: string;
    deptGroupId: number;
    deptGroupName: string;
}

  
  // models/time-type.model.ts
  export interface TimeType {
    id: number;
    name: string;
  }
  