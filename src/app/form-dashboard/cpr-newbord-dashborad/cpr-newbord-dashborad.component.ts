import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { CprNewbornFormComponent } from './cpr-newborn-form/cpr-newborn-form.component';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

@Component({
  selector: 'app-cpr-newbord-dashborad',
  templateUrl: './cpr-newbord-dashborad.component.html',
  styleUrls: ['./cpr-newbord-dashborad.component.css']
})
export class CprNewbordDashboradComponent implements OnInit {
  displayedColumns: string[] = ['Id', 'motherName', 'motherId', 'babyId', 'babyGender', 'babyWeight', 'deliveryMethod', 'location', 'actions'];
  dataSource = new MatTableDataSource<any>();
  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private confirmationDialogService: ConfirmationDialogService,
  ) { }

  ngOnInit(): void {
    // Replace with API call from your backend:
    this.dataSource.data = [];
    this.getNewBornCprList();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  getAverageWeight(): number {
    const weights = this.dataSource.data.map((d: any) => d.babyWeight || 0);
    return weights.reduce((a: number, b: number) => a + b, 0) / weights.length;
  }

  viewDetails(element: any) {
    // You can open a dialog or navigate
    let dg = this.dialog.open(CprNewbornFormComponent, {
      disableClose: true,
      data: {
        data: element,
        type: "print"
      },
      width: '90%',
      height: '90%'
    });
    dg.afterClosed().subscribe(res => {
      if (res != undefined) {
        const printWindow = window.open('', '_blank');

        // It's good practice to check if the window was successfully opened (e.g., not blocked by a popup blocker)
        if (printWindow) {
          // Use document.open() before write() if you're potentially overwriting existing content
          printWindow.document.open();

          // Write the HTML content
          printWindow.document.write(`
    <html>
      <head>
        <title>הדפסה</title>
        <style>
          /* You might want to add print-specific styles here */
          @media print {
            body {
              /* Add your print styles */
            }
          }
        </style>
      </head>
      <body>${res}</body>
    </html>
  `);

          // Close the document stream
          printWindow.document.close();

          // --- Add the event listener to close the window AFTER printing/cancelling ---
          printWindow.onafterprint = function () {
            printWindow.close();
          };
          // -----------------------------------------------------------------------

          // Call the print function. This will typically block execution
          // in this window until the print dialog is closed by the user.
          printWindow.print();

          // The printWindow?.document.close(); line you had after printWindow?.print();
          // is unnecessary and can be removed. The onafterprint event handles the closing.

        } else {
          // Handle cases where the popup was blocked
          alert('אנא אפשר חלונות קופצים להדפסה.'); // "Please allow popups for printing."
        }
      }
      this.getNewBornCprList();
    });
  }

  editForm(element: any) {
    // Navigate to edit form
    // You can open a dialog or navigate
    this.dialog.open(CprNewbornFormComponent, {
      disableClose: true,
      data: {
        data: element,
        type: "edit"
      },
      width: '90%',
      height: '90%'
    }).afterClosed().subscribe(() => {
      this.getNewBornCprList();
    });
  }

  getNewBornCprList() {
    this.http
      .post(environment.url + "GetNewBornCprList", {
      })
      .subscribe((Response) => {
        this.dataSource = new MatTableDataSource<any>(Response["d"])
      });
  }

  preparePdf(element) {
    // You can open a dialog or navigate
    let dg = this.dialog.open(CprNewbornFormComponent, {
      disableClose: true,
      data: {
        data: element.Id,
        type: "print"
      },
      width: '90%',
      height: '90%'
    });
    dg.afterClosed().subscribe(res => {
      if (res != undefined) {
        let html = `
        <html>
          <head>
            <title>הדפסה</title>
            <style>
              /* You might want to add print-specific styles here */
              @media print {
                body {
                  /* Add your print styles */
                }
              }
            </style>
          </head>
          <body>${res}</body>
        </html>
      `;
        this.sendToNamer(html, element);
      }
    });
  }

  async sendToNamer(html, select) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "לשלוח לנמר ? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          this.http.post(environment.urlipracticom + "createCprNewBornPdfOnServer", {
            case_number: select.babyCasenumber,
            passport: select.babyId,
            html: html
          }
          )
            .subscribe((Response) => {
              let that = this;
              setTimeout(() => {
                that.http.post(environment.urlipracticom + "LinkPdfToPatientNamer", {
                  CaseNumber: select.casenumber,
                  FormID: "1",
                  Catigory: "ZPO_NBCPRF",
                  fileSource:
                    Response["d"],
                }
                )
                  .subscribe((Response) => {
                    if (
                      Response["d"] ==
                      "success"
                    ) {
                      $("#loader_2").addClass("d-none");
                      that.openSnackBar(
                        "! נשמר בהצלחה לתיק מטופל בנמר"
                      );
                    } else {
                      that.openSnackBar(
                        "! משהו לא תקין"
                      );
                    }
                  });
              }, 1000);
            });
        } else {
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 2000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

}
