import qrcode
import json
import cv2
from pyzbar import pyzbar

equipo = {
    "type": "equipment",
    "nombre": "Ludlum 26-1",
    "AMD": "1",
    "Utilidad": "Contaminacion",
    "Fecha_Cal": "05_06_2026",
    "Codigo": "000001",
    "Tipo_det": "Geiger Muller"
}

img = qrcode.make(json.dumps(equipo))
img.save("Equi.png")

Destino = {
    "type": "location",
    "Instalacion": "LAAN",
}

img = qrcode.make(json.dumps(Destino))
img.save("Location.png")

Usuario = {
    "type": "user",
    "nombre": "Sebastian Sepulveda",
}

img = qrcode.make(json.dumps(Usuario))
img.save("User.png")


cap = cv2.VideoCapture(0)
print("Webcam abierta:", cap.isOpened())

Codigo_leido = None

while True:
    ret, frame = cap.read()
    if not ret:
        print("No se pudo acceder a la webcam")
        break
    qrs = pyzbar.decode(frame)
    for qr in qrs:
        if qr.data == Codigo_leido:
            continue
        else:
            Codigo_leido = qr.data
            print(qr.data)
    cv2.imshow("Scanner", frame)
    if cv2.waitKey(1) == ord("q"):
        break