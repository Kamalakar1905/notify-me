package com.notifyme.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.notifyme.model.NotificationHistory;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;

@Service
@Slf4j
public class ExportService {

    public byte[] exportToCsv(List<NotificationHistory> records) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        pw.println("ID,Title,Type,Status,Sent At,Opened At,Retry Count");
        for (NotificationHistory n : records) {
            pw.printf("%s,%s,%s,%s,%s,%s,%d%n",
                    n.getId(),
                    escape(n.getTitle()),
                    n.getNotificationType(),
                    n.getStatus(),
                    n.getSentAtUtc() != null ? n.getSentAtUtc().toString() : "",
                    n.getOpenedAtUtc() != null ? n.getOpenedAtUtc().toString() : "",
                    n.getRetryCount());
        }
        return sw.toString().getBytes();
    }

    public byte[] exportToExcel(List<NotificationHistory> records) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Notification History");

            // Header row
            Row header = sheet.createRow(0);
            String[] columns = {"ID", "Title", "Type", "Status", "Sent At", "Opened At", "Retry Count"};
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 1;
            for (NotificationHistory n : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(n.getId().toString());
                row.createCell(1).setCellValue(n.getTitle() != null ? n.getTitle() : "");
                row.createCell(2).setCellValue(n.getNotificationType().name());
                row.createCell(3).setCellValue(n.getStatus().name());
                row.createCell(4).setCellValue(n.getSentAtUtc() != null ? n.getSentAtUtc().toString() : "");
                row.createCell(5).setCellValue(n.getOpenedAtUtc() != null ? n.getOpenedAtUtc().toString() : "");
                row.createCell(6).setCellValue(n.getRetryCount());
            }

            for (int i = 0; i < columns.length; i++) sheet.autoSizeColumn(i);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Excel export failed: {}", e.getMessage());
            throw new RuntimeException("Export failed", e);
        }
    }

    public byte[] exportToPdf(List<NotificationHistory> records) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, out);
            document.open();

            document.add(new Paragraph("Notification History",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
            document.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            String[] headers = {"Title", "Type", "Status", "Sent At", "Opened At", "Retries"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h,
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
                cell.setBackgroundColor(BaseColor.LIGHT_GRAY);
                table.addCell(cell);
            }

            for (NotificationHistory n : records) {
                table.addCell(n.getTitle() != null ? n.getTitle() : "");
                table.addCell(n.getNotificationType().name());
                table.addCell(n.getStatus().name());
                table.addCell(n.getSentAtUtc() != null ? n.getSentAtUtc().toString() : "");
                table.addCell(n.getOpenedAtUtc() != null ? n.getOpenedAtUtc().toString() : "");
                table.addCell(String.valueOf(n.getRetryCount()));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            log.error("PDF export failed: {}", e.getMessage());
            throw new RuntimeException("Export failed", e);
        }
    }

    private String escape(String value) {
        if (value == null) return "";
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}
