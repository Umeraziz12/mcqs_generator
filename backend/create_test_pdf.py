from reportlab.pdfgen import canvas

def create_pdf(filename):
    c = canvas.Canvas(filename)
    c.drawString(100, 750, "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy.")
    c.drawString(100, 730, "Through cellular respiration, this chemical energy can later be released to fuel the organism's activities.")
    c.drawString(100, 710, "This chemical energy is stored in carbohydrate molecules, such as sugars, which are synthesized from carbon dioxide and water.")
    c.save()

if __name__ == "__main__":
    create_pdf("test.pdf")
