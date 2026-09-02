/** API משותף לפאנלים עם סיידבר סינון — נקרא מהדשבורד הראשי */
export interface PciDashboardFilterPanel {
    hasActiveFilters(): boolean;
    toggleFilterSidebar(): void;
}
