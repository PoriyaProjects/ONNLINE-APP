/** API משותף לפאנלים עם סיידבר סינון — נקרא מהדשבורד הראשי */
export interface SurgeryDashboardFilterPanel {
    hasActiveFilters(): boolean;
    toggleFilterSidebar(): void;
}
