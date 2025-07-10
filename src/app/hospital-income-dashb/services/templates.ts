export function getDeptGroupHtml(slug: string): string {

  return `</div><div id="dept-dynamic-${slug}"></div>`;}

    
export function getDepartmentLayoutHtml(slug: string): string {      
  return `
    <div class="row">
      <div class="mdc-layout-grid__cell col-md-12">        
        <h3 style="text-align: center;"> הכנסות כלליות - מחלקת ${slug}</h3>
        <div class="row">
          <div class="mdc-layout-grid__cell col-md-6">
            <div class="card card--outlined card text-center">
              <h6 class="card-title-custom">הכנסות שנתיות</h6>
              <div id="bar_chart-${slug}" style="width: 100%; height: 400px;">טוען נתונים...</div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
          <div class="mdc-layout-grid__cell col-md-3">
            <div class="card text-center">
              <h6 class="card-title-custom">נומינלי ושינוי</h6>
              <div id="tabled_chart-${slug}" style="width: 100%; height: 300px; padding:0 20px; margin-top: 40px;">טוען נתונים...</div>
              <div id="tabled_chart2-${slug}" style="width: 100%; padding:0 20px;">טוען נתונים...</div>
            </div>
          </div>
          <div class="mdc-layout-grid__cell col-md-3">
            <div class="card text-center">
              <h6 class="card-title-custom">הכנסות מדודות</h6>              
              <div id="arc_chart-${slug}" style="width: 100%; height: 370px;"></div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
        </div>

        <h3 style="text-align: center;">גרפים וניתוחים</h3>
        <div class="row text-center">
          <h6 class="col-md-12">* נתונים מעודכנים ל-10 בכל חודש עבור חודש קודם</h6>
          <div class="mdc-layout-grid__cell col-md-6">
            <div class="card text-center">
              <h6 class="card-title-custom">הכנסות לפי חודש אחרון</h6>
              <div id="incomedeptslastmonthv-${slug}" style="width: 100%; height: 460px;">טוען נתונים...</div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
          <div class="mdc-layout-grid__cell col-md-6">
            <div class="card text-center">
              <h6 class="card-title-custom">הכנסות חודשיות (רצופות)</h6>
              <div id="bar_chart2-${slug}" style="width: 100%; height: 460px;">טוען נתונים...</div>
              <div class="ctrl-placeholder"></div>
            </div>
          </div>
        </div>

        <h2 style="text-align: center;">3 שנים אחרונות</h2>
        <div class="row text-center">
          <h6 class="col-md-12">* מידע פיננסי מתעדכן ב-10 לכל חודש</h6>
          <div class="mdc-layout-grid__cell col-md-12">
            <div class="card text-center">
              <div id="growth_trend_chart-${slug}" style="width: 100%; height: 500px;">טוען נתונים...</div>
            </div>
          </div>
        </div>

        <div id="dept-dynamic-${slug}" class="ctrl-placeholder" style="margin-top: 40px;"></div>
        <div style="height:60px;"></div>        
      </div>
    </div>
  `;
}
      