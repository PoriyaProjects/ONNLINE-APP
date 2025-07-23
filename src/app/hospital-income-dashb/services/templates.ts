export function getDeptGroupHtml(id: number, slug?: string): string {return `</div><div id="dept-dynamic-${id}"></div>`;}
export function getDeptFeGroupHtml(id: number, slug?: string): string {return `</div><br/>מחלקות מחייבות עבור טיפול בפגים בתקופה מ- 2024-01-01 עד 2025-05-31<br/><br/><div id="nbspecial"></div><div id="dept-dynamic-${id}"></div>`;}

    
export function getDepartmentLayoutHtml(id: number, deptName: string, deptNameSlug?: any): string {      
  return `
    <div class="row">
      <div class="mdc-layout-grid__cell col-md-12">        
        <h3 style="text-align: center;margin:40px auto;"> הכנסות מחלקת ${deptName}</h3>
        <div class="row">
          <div class="mdc-layout-grid__cell col-md-6">
            <div class="card card--outlined card text-center">
              <h6 class="card-title-custom" style="margin:20px auto;">הכנסות שנתיות</h6>
              <div id="bar_chart-${id}" style="width: 100%; height: 390px;">טוען נתונים...</div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
          <div class="mdc-layout-grid__cell col-md-3">
            <div class="card text-center">
              <h6 class="card-title-custom" style="margin:20px auto;">נומינלי ושינוי</h6>
              <div id="tabled_chart-${id}" style="width: 100%; height: 350px; padding:0 20px; margin-top: 40px;">טוען נתונים...</div>
              
            </div>
          </div>
          <div class="mdc-layout-grid__cell col-md-3">
            <div class="card text-center">
              <h6 class="card-title-custom" style="margin:20px auto;">הכנסות מדודות</h6>              
              <div id="arc_chart-${id}" style="width: 100%; height: 390px;"></div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
        </div>
 <div style="height:60px;"></div>        
        <h3 style="text-align: center;">גרפים וניתוחים</h3>
        <div class="row text-center">
          <h6 class="col-md-12">* נתונים מעודכנים ל-10 בכל חודש עבור חודש קודם</h6>
          <div class="mdc-layout-grid__cell col-md-6">
            <div class="card text-center">
              <h6 class="card-title-custom" style="margin:20px auto;">הכנסות לפי חודש אחרון</h6>
              <div id="incomedeptslastmonthv-${id}" style="width: 100%; height: 460px;">טוען נתונים...</div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
          <div class="mdc-layout-grid__cell col-md-6">
            <div class="card text-center">
              <h6 class="card-title-custom" style="margin:20px auto;">הכנסות חודשיות (רצופות)</h6>
              <div id="bar_chart2-${id}" style="width: 100%; height: 460px;">טוען נתונים...</div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
        </div>
 <div style="height:60px;"></div>        
        <h2 style="text-align: center;">3 שנים אחרונות</h2>
        <div class="row text-center">
          <h6 class="col-md-12">* מידע פיננסי מתעדכן ב-10 לכל חודש</h6>
          <div class="mdc-layout-grid__cell col-md-12">
            <div class="card text-center">
              <div id="growth_trend_chart-${id}" style="width: 100%; height: 500px;">טוען נתונים...</div>
            </div>
          </div>
        </div>

        <div id="dept-dynamic-${id}" class="ctrl-placeholder" style="margin-top: 40px;"></div>
        <div style="height:60px;"></div>        
      </div>
    </div>
  `;
}
      