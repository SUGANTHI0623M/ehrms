import { jsPDF } from 'jspdf';

export interface OfferLetterData {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  compensation: string;
  joiningDate: string;
  expiryDate: string;
  offerOwner?: string;
  companyName?: string;
  companyAddress?: string;
  notes?: string;
}

/**
 * Generate PDF offer letter
 */
export const generateOfferLetterPDF = (data: OfferLetterData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
  };

  // Company Header (if provided)
  if (data.companyName) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.companyName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  }

  if (data.companyAddress) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressLines = doc.splitTextToSize(data.companyAddress, pageWidth - 2 * margin);
    doc.text(addressLines, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += addressLines.length * 5 + 10;
  }

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFER LETTER', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Date: ${currentDate}`, margin, yPosition);
  yPosition += 10;

  // Candidate Information
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dear ${data.candidateName},`, margin, yPosition);
  yPosition += 10;

  // Introduction
  const introText = `We are pleased to offer you the position of ${data.jobTitle} in our ${data.department} department.`;
  const introLines = doc.splitTextToSize(introText, pageWidth - 2 * margin);
  doc.text(introLines, margin, yPosition);
  yPosition += introLines.length * 5 + 10;

  // Offer Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFER DETAILS', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    { label: 'Position:', value: data.jobTitle },
    { label: 'Department:', value: data.department },
    { label: 'Employment Type:', value: data.employmentType },
    { label: 'Compensation:', value: data.compensation },
    { label: 'Expected Joining Date:', value: data.joiningDate },
    { label: 'Offer Expiry Date:', value: data.expiryDate },
  ];

  details.forEach((detail) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.text(detail.label, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    const valueX = margin + 60;
    const valueLines = doc.splitTextToSize(detail.value, pageWidth - valueX - margin);
    doc.text(valueLines, valueX, yPosition);
    yPosition += Math.max(5, valueLines.length * 5) + 3;
  });

  yPosition += 5;

  // Additional Notes (if provided)
  if (data.notes) {
    checkPageBreak(15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesText = `Additional Notes: ${data.notes}`;
    const notesLines = doc.splitTextToSize(notesText, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPosition);
    yPosition += notesLines.length * 5 + 10;
  }

  // Closing
  checkPageBreak(20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('We look forward to welcoming you to our team and are excited about the', margin, yPosition);
  yPosition += 5;
  doc.text('contributions you will make to our organization.', margin, yPosition);
  yPosition += 10;

  doc.text('Please confirm your acceptance of this offer by the expiry date mentioned above.', margin, yPosition);
  yPosition += 10;

  // Signature Section
  checkPageBreak(30);
  doc.text('Best regards,', margin, yPosition);
  yPosition += 10;

  if (data.offerOwner) {
    doc.setFont('helvetica', 'bold');
    doc.text(data.offerOwner, margin, yPosition);
    yPosition += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.text('Human Resources Department', margin, yPosition);

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('This is a confidential document. Please do not share without authorization.', pageWidth / 2, footerY, { align: 'center' });

  // Generate filename
  const fileName = `Offer_Letter_${data.candidateName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  
  // Save PDF
  doc.save(fileName);
};

