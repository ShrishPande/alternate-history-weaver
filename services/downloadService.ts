
import jsPDF from 'jspdf';
import { HistoryEntry } from './types';

const formatDisplayYear = (year: number | null): string => {
    if (year === null) return '';
    if (year < 0) return `${-year} BC`;
    return `${year} AD`;
};

export const downloadTimelineAsPDF = (history: HistoryEntry[]): void => {
    const doc = new jsPDF();
    let yPos = 15;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;

    doc.setFontSize(18);
    doc.text('Alternate History Timeline', 10, yPos);
    yPos += 10;

    history.forEach(entry => {
        if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }

        doc.setFontSize(12);
        const narrativeText = `(${formatDisplayYear(entry.year)}) ${entry.narrative}`;
        const splitNarrative = doc.splitTextToSize(narrativeText, 180);
        doc.text(splitNarrative, 10, yPos);
        yPos += (splitNarrative.length * 7);

        if (entry.choice) {
            if (yPos > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }
            doc.setFont('helvetica', 'italic');
            const choiceText = entry.choice;
            const splitChoice = doc.splitTextToSize(choiceText, 170);
            doc.text(splitChoice, 15, yPos);
            yPos += (splitChoice.length * 7);
            doc.setFont('helvetica', 'normal');
        }
        
        yPos += 5;
    });

    doc.save('alternate-history-timeline.pdf');
};
