#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <BLEClient.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>

// ==================== ส่วนเชื่อมต่อ Wi-Fi และ Node.js Backend ====================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "Share";         // <-- เปลี่ยนเป็นชื่อ Wi-Fi ของคุณ
const char* password = "12344321"; // <-- เปลี่ยนเป็นรหัส Wi-Fi ของคุณ
const char* server_ip = "10.218.99.139";     // <-- เปลี่ยนเป็น IP ของเครื่องคอมพิวเตอร์ที่รัน Node.js
const int server_port = 3000;

String currentPatientId = "";
String currentPatientName = "";

// ==================== สำหรับ Omron Blood Pressure ====================
#include <nvs_flash.h>
#include "esp_bt_main.h"
#include "esp_bt_device.h"

// ==================== Sensor Objects ====================
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// ==================== Ultrasonic (Height) ====================
const int pingPin     = 5;
const int inPin       = 18;
const int BASE_HEIGHT = 200;

// ==================== BLE Configuration: เครื่องชั่งน้ำหนัก ====================
#define MY_SCALE_MAC        "70:87:9E:98:B1:D6"
#define WEIGHT_SERVICE_UUID "0000181d-0000-1000-8000-00805f9b34fb"
#define WEIGHT_CHAR_UUID    "00002a9d-0000-1000-8000-00805f9b34fb"
#define MI_SERVICE_UUID     "0000181b-0000-1000-8000-00805f9b34fb"
#define MI_WEIGHT_CHAR_UUID "00002a9c-0000-1000-8000-00805f9b34fb"
#define MLX_SDA 25
#define MLX_SCL 26

// ==================== BLE Configuration: Omron วัดความดัน ====================
static BLEUUID OMRON_SERVICE_UUID((uint16_t)0x1810);
static BLEUUID OMRON_CHAR_UUID((uint16_t)0x2A35);

// ==================== ลำดับขั้นตอนการวัด ====================
enum MeasurementStage {
    STAGE_WAIT_PATIENT, // รอคิวผู้ป่วยจาก Server
    STAGE_HEIGHT,   
    STAGE_WEIGHT,   
    STAGE_VITALS,   
    STAGE_BP,       
    STAGE_DONE      
};
MeasurementStage currentStage = STAGE_WAIT_PATIENT;

// ==================== ค่าที่วัดได้ ====================
float lastWeight = 0.0;
long  lastHeight = 0;
float lastTemp   = 0.0;
uint16_t latest_systolic  = 0;
uint16_t latest_diastolic = 0;

bool needUpdateLCD    = false;
bool weightStabilized = false;
bool bpDataReady      = false;

// ==================== ค่าที่วัดได้ ====================
// ... (โค้ดก่อนหน้า) ...

int  heightStableCount           = 0;
long lastStableHeightVal         = 0;
// 🔴 ปรับเป็น 10 (อ่านค่าทุก 300ms x 10 ครั้ง = ยืนนิ่งประมาณ 3 วินาที)
const int HEIGHT_STABLE_REQUIRED = 10; 

int tempStableCount = 0;
// 🔴 ปรับเป็น 6 (อ่านค่าทุก 500ms x 6 ครั้ง = แตะค้างไว้ประมาณ 3 วินาที)
const int TEMP_STABLE_REQUIRED = 6;

// ==================== ตัวแปร BLE ====================
static BLEAdvertisedDevice* myDeviceScale = nullptr;
static BLEClient* pClientScale            = nullptr;
static boolean doConnectScale             = false;
static boolean connectedScale             = false;
static boolean doScanScale                = false;
unsigned long lastDataTime                = 0;

static BLERemoteCharacteristic* pOmronChar = nullptr;
static BLEAdvertisedDevice* myDeviceOmron  = nullptr;
static BLEClient* pClientOmron             = nullptr;
static boolean doConnectOmron              = false;
static boolean connectedOmron              = false;
static boolean doScanOmron                 = false;

// ฟังก์ชันส่งข้อความไปแสดงบน Serial Monitor ในหน้าเว็บ
void sendLogToServer(String msg) {
    Serial.println(msg); 
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = "http://" + String(server_ip) + ":" + String(server_port) + "/api/iot/log";
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        String payload = "{\"message\":\"" + msg + "\"}";
        http.POST(payload);
        http.end();
    }
}

// ฟังก์ชันส่งตัวเลข Sensor ที่กำลังวัดอยู่ ให้ขยับบนหน้าเว็บสดๆ
void sendLiveSensorData(float t, float w, float h, int sys, int dia, int bpm) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = "http://" + String(server_ip) + ":" + String(server_port) + "/api/iot/live-sensor";
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        String payload = "{\"temp\":" + String(t) + ",\"weight\":" + String(w) + ",\"height\":" + String(h) + ",\"sys\":" + String(sys) + ",\"dia\":" + String(dia) + ",\"bpm\":" + String(bpm) + "}";
        http.POST(payload);
        http.end();
    }
}

void lcdPrintLine(int row, String text) {
    String logText = "[LCD Row " + String(row) + "] " + text;
    sendLogToServer(logText); // <--- เปลี่ยนมาเรียกใช้ฟังก์ชันนี้แทน
}

// ==================== ระบบความปลอดภัย BLE ====================
class OmronSecurityCallbacks : public BLESecurityCallbacks {
    uint32_t onPassKeyRequest() { return 000000; }
    void onPassKeyNotify(uint32_t pass_key) {}
    bool onConfirmPIN(uint32_t pass_key) { return true; }
    bool onSecurityRequest() { return true; }
    void onAuthenticationComplete(esp_ble_auth_cmpl_t cmpl) {
        if (cmpl.success) Serial.println(">>> [Omron] จับคู่กุญแจสำเร็จ!");
        else Serial.println(">>> [Omron] จับคู่กุญแจล้มเหลว");
    }
};

// ==================== Callbacks ====================
static void notifyCallbackScale(BLERemoteCharacteristic* pBLERemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    unsigned long currentTime = millis();
    if ((currentTime - lastDataTime) < 200) return;
    if (length >= 10) {
        uint8_t controlByte = pData[0];
        bool hasStabilized  = (controlByte & 0x20) != 0;
        bool isLbs          = (controlByte & 0x01) != 0;
        uint16_t weightRaw = pData[1] | (pData[2] << 8);
        float weight = weightRaw / (isLbs ? 100.0 : 200.0);
        if (isLbs) weight *= 0.453592;

        if (weight > 0) {
            lastWeight    = weight;
            lastDataTime  = currentTime;
            needUpdateLCD = true;

            sendLiveSensorData(0, weight, 0, 0, 0, 0);
        }
        if (hasStabilized && weight > 0) {
            weightStabilized = true;
            Serial.printf("✅ Weight STABLE: %.2f kg\n", weight);
        }
    }
}

class ScaleClientCallback : public BLEClientCallbacks {
    void onConnect(BLEClient* pclient) { connectedScale = true; Serial.println("✅ Scale BLE Connected!"); }
    void onDisconnect(BLEClient* pclient) { connectedScale = false; doScanScale = true; Serial.println("❌ Scale BLE Disconnected"); }
};

static void notifyCallbackOmron(BLERemoteCharacteristic* pBLERemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    if (length >= 5) {
        latest_systolic  = (pData[2] << 8) | pData[1];
        latest_diastolic = (pData[4] << 8) | pData[3];
        Serial.println(">>> ได้รับข้อมูลจาก OMRON แล้ว!");

        sendLiveSensorData(0, 0, 0, latest_systolic, latest_diastolic, 0);
    }
}

class OmronClientCallback : public BLEClientCallbacks {
    void onConnect(BLEClient* pclient) { connectedOmron = true; Serial.println(">>> [Omron] เชื่อมต่อ Bluetooth สำเร็จ!"); }
    void onDisconnect(BLEClient* pclient) {
        connectedOmron = false; Serial.println(">>> [Omron] ตัดการเชื่อมต่อแล้ว");
        if (latest_systolic > 0) bpDataReady = true;
        doScanOmron = true;
    }
};

class UnifiedScanCallback : public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        if (currentStage == STAGE_WEIGHT) {
            String currentAddress = advertisedDevice.getAddress().toString().c_str();
            currentAddress.toUpperCase();
            String targetAddress = MY_SCALE_MAC; targetAddress.toUpperCase();
            if (currentAddress == targetAddress) {
                BLEDevice::getScan()->stop();
                if (myDeviceScale != nullptr) delete myDeviceScale;
                myDeviceScale = new BLEAdvertisedDevice(advertisedDevice);
                doConnectScale = true; doScanScale = false;
                Serial.println("🔵 Scale Found!");
            }
        } else if (currentStage == STAGE_BP) {
            if (advertisedDevice.haveServiceUUID() && advertisedDevice.isAdvertisingService(OMRON_SERVICE_UUID)) {
                BLEDevice::getScan()->stop();
                if (myDeviceOmron != nullptr) delete myDeviceOmron;
                myDeviceOmron = new BLEAdvertisedDevice(advertisedDevice);
                doConnectOmron = true; doScanOmron = false;
                Serial.println("🔵 Omron BP Found!");
            }
        }
    }
};

// ==================== ฟังก์ชันเชื่อมต่อ BLE ====================
bool connectToScaleServer() {
    if (!pClientScale->connect(myDeviceScale)) return false;
    BLERemoteService* pRemoteService = pClientScale->getService(BLEUUID(MI_SERVICE_UUID));
    if (!pRemoteService) pRemoteService = pClientScale->getService(BLEUUID(WEIGHT_SERVICE_UUID));
    if (!pRemoteService) { pClientScale->disconnect(); return false; }
    BLERemoteCharacteristic* pChar = pRemoteService->getCharacteristic(BLEUUID(MI_WEIGHT_CHAR_UUID));
    if (!pChar) pChar = pRemoteService->getCharacteristic(BLEUUID(WEIGHT_CHAR_UUID));
    if (!pChar) { pClientScale->disconnect(); return false; }
    if (pChar->canNotify() || pChar->canIndicate()) pChar->registerForNotify(notifyCallbackScale);
    else { pClientScale->disconnect(); return false; }
    connectedScale = true; return true;
}

bool connectToOmronServer() {
    Serial.println("กำลังพยายามเชื่อมต่อกับ OMRON...");
    if (!pClientOmron->connect(myDeviceOmron)) return false;
    pClientOmron->setMTU(517); delay(2000);
    if (!connectedOmron) { Serial.println(">>> Omron ยกเลิกการเชื่อมต่อกลางคัน"); return false; }
    BLERemoteService* pRemoteService = pClientOmron->getService(OMRON_SERVICE_UUID);
    if (pRemoteService == nullptr) { pClientOmron->disconnect(); return false; }
    pOmronChar = pRemoteService->getCharacteristic(OMRON_CHAR_UUID);
    if (pOmronChar == nullptr) { pClientOmron->disconnect(); return false; }
    if (pOmronChar->canIndicate()) pOmronChar->registerForNotify(notifyCallbackOmron, false);
    else if (pOmronChar->canNotify()) pOmronChar->registerForNotify(notifyCallbackOmron);
    return true;
}

long readHeight() {
    // กำหนด Pin ให้ชัวร์ก่อนยิงคลื่น
    pinMode(pingPin, OUTPUT);
    pinMode(inPin, INPUT);
    
    digitalWrite(pingPin, LOW);  
    delayMicroseconds(2);
    digitalWrite(pingPin, HIGH); 
    delayMicroseconds(10);
    digitalWrite(pingPin, LOW);
    
    // รับคลื่นสะท้อนกลับ (จำกัดเวลา 30,000us)
    long duration = pulseIn(inPin, HIGH, 30000);
    if (duration == 0) return 0; // ไม่เจอวัตถุ (อาจจะโล่งเกินไป)

    long dist = duration / 58; // ระยะจากเซนเซอร์ถึง "หัวคน" (ซม.)
    long height = BASE_HEIGHT - dist; // ความสูงเสา - ระยะห่าง = ความสูงคน

    // 🔴 ปริ้นท์ตัวเลขออกมาดูใน Arduino Serial Monitor (มุมขวาบนของโปรแกรม Arduino)
    // จะได้รู้ว่าเซนเซอร์พัง หรือแค่ค่ามันหลุดเกณฑ์!
    Serial.print("👉 [Sensor] ระยะห่างหัว: "); Serial.print(dist);
    Serial.print(" cm | ความสูงที่คำนวณได้: "); Serial.print(height);
    Serial.println(" cm");

    // 1. ป้องกันคลื่นรบกวน ถ้าระยะสะท้อนน้อยกว่า 5 ซม. (แปลกเกินไป) ให้ข้าม
    if (dist < 5) return 0;

    // 2. ขยายเกณฑ์รับความสูงให้กว้างขึ้น (รับได้ตั้งแต่เด็ก 50 ซม. ถึงคนสูง 220 ซม.)
    // ถ้าวัดแล้วความสูงอยู่ในช่วงนี้ ถือว่าเป็น "คน" ให้ส่งค่าไปใช้
    if (height >= 50 && height <= 220) {
        return height;
    }

    // ถ้าวัดได้ค่านอกเหนือจากนี้ (เช่น 0 หรือ 200 ซม. จากพื้น) ให้ตีว่าไม่มีคนยืน
    return 0; 
}

float readTemp() {
    float object  = mlx.readObjectTempC();
    if (isnan(object) || object < -40.0) return lastTemp;
    float temp = object + 2.0;
    if (temp >= 20.0 && temp <= 45.0) return temp;
    return lastTemp;
}

// ==================== การทำงานแต่ละสถานะ ====================
void enterStage(MeasurementStage s) {
    currentStage = s;
    Serial.println("\n--- เปลี่ยนสถานะใหม่ ---");
    switch (s) {
        case STAGE_WAIT_PATIENT:
            lcdPrintLine(0, "Station Ready");
            lcdPrintLine(1, "Waiting for Queue...");
            break;
        case STAGE_HEIGHT:
            heightStableCount = 0; lastStableHeightVal = 0;
            lcdPrintLine(0, "[1/4] Height");
            lcdPrintLine(1, "Please stand still");
            break;
        case STAGE_WEIGHT:
            weightStabilized = false; lastWeight = 0; doScanScale = true;
            lcdPrintLine(0, "[2/4] Weight");
            lcdPrintLine(1, "Step on the scale");
            lcdPrintLine(2, "Scanning forever...");
            break;
        case STAGE_VITALS:
            lastTemp = 0;
            tempStableCount = 0;
            lcdPrintLine(0, "[3/4] Temp");
            lcdPrintLine(1, "Aim MLX at forehead");
            lcdPrintLine(2, "Waiting for valid Temp...");
            break;
        case STAGE_BP:
            bpDataReady = false; latest_systolic = 0; latest_diastolic = 0; doScanOmron = true;
            lcdPrintLine(0, "[4/4] Blood Pressure");
            lcdPrintLine(1, "Start Omron device");
            lcdPrintLine(2, "Scanning forever...");
            break;
        case STAGE_DONE:
            break;
    }
}

void showSummary() {
    Serial.println("\n========== สรุปผลการวัด ==========");
    lcdPrintLine(0, "Height: " + String(lastHeight) + " cm");
    lcdPrintLine(1, "Weight: " + String(lastWeight, 2) + " kg");
    lcdPrintLine(2, "T:" + String(lastTemp, 1) + "C  BPM: 0 (Disabled)");
    lcdPrintLine(3, "BP:" + String(latest_systolic) + "/" + String(latest_diastolic) + " mmHg");
    Serial.println("==================================");
}

// 0. สถานะรอคิวผู้ป่วย
void handleWaitPatientStage() {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 3000) {
        lastCheck = millis();
        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            String url = String("http://") + server_ip + ":" + server_port + "/api/iot/check-bypass";
            http.begin(url);
            int httpCode = http.GET();
            
            if (httpCode == HTTP_CODE_OK) {
                String payload = http.getString();
                DynamicJsonDocument doc(1024);
                deserializeJson(doc, payload);
                
                String status = doc["status"].as<String>();
                if (status == "ready_bypass" || status == "ready") {
                    currentPatientId = doc["patientId"].as<String>();
                    currentPatientName = doc["name"].as<String>();
                    
                    Serial.println("\n==================================");
                    Serial.println("✅ พบผู้ป่วยเข้าสถานี: " + currentPatientName);
                    sendLogToServer("✅ พบผู้ป่วยเข้าสถานี: " + currentPatientName);
                    Serial.println("==================================");
                    delay(2000);
                    enterStage(STAGE_HEIGHT);
                } else {
                    Serial.println("ไม่มีคิว รอผู้ป่วยสแกน Barcode...");
                }
            }
            http.end();
        } else {
            Serial.println("Wi-Fi Disconnected! กำลังเชื่อมต่อใหม่...");
            WiFi.reconnect();
        }
    }
}

void handleHeightStage() {
    static unsigned long lastRead = 0;
    if (millis() - lastRead >= 300) {
        lastRead = millis();
        long h = readHeight();
        
        // ถ้า h > 0 แปลว่ามีคนมายืนจริงๆ (ความสูง 90-220 cm)
        if (h > 0) { 
            // เช็คว่ายืนนิ่งไหม (ความสูงแกว่งไม่เกิน 3 cm)
            if (abs(h - lastStableHeightVal) <= 3) {
                heightStableCount++;
            } else {
                heightStableCount = 0; // ถ้ายุกยิก ให้เริ่มนับ 3 วิ ใหม่
            }
            lastStableHeightVal = h;
            
            // คำนวณเวลานับถอยหลัง 3 วินาที (300ms * 10 รอบ = 3000ms)
            int secLeft = 3 - (heightStableCount * 300 / 1000);
            if (secLeft < 0) secLeft = 0;
            
            lcdPrintLine(2, "H: " + String(h) + " cm (Wait " + String(secLeft) + "s)");
            sendLiveSensorData(0, 0, h, 0, 0, 0);

            // ถ้ายืนนิ่งครบกำหนดเวลา (3 วินาที)
            if (heightStableCount >= HEIGHT_STABLE_REQUIRED) {
                lastHeight = h;
                lcdPrintLine(3, "✅ Height OK: " + String(lastHeight) + "cm");
                delay(1500); 
                enterStage(STAGE_WEIGHT); 
            }
        } else {
            // ถ้าอ่านได้ 0 (เดินออกไปแล้ว หรือยังไม่มีคน) ให้รีเซ็ตเวลาเป็น 0
            heightStableCount = 0;
            lastStableHeightVal = 0;
            lcdPrintLine(2, "Waiting for patient...");
        }
    }
}

void handleWeightStage() {
    if (doConnectScale) {
        if (connectToScaleServer()) lcdPrintLine(2, "Connected! Wait for weight...");
        else { lcdPrintLine(2, "Connect fail, retry"); doScanScale = true; }
        doConnectScale = false;
    }
    if (doScanScale) { BLEDevice::getScan()->start(2, false); doScanScale = false; }
    if (!connectedScale && !doConnectScale) {
        static unsigned long lastScanTime = 0;
        if (millis() - lastScanTime > 3000) { lastScanTime = millis(); doScanScale = true; }
    }
    if (needUpdateLCD) { lcdPrintLine(2, "Weight: " + String(lastWeight, 2) + " kg"); needUpdateLCD = false; }
    if (weightStabilized) {
        lcdPrintLine(3, "✅ Weight OK: " + String(lastWeight, 2) + "kg");
        if (pClientScale->isConnected()) pClientScale->disconnect();
        delay(1500); enterStage(STAGE_VITALS);
    }
}

void handleVitalsStage() {
    static unsigned long lastRead = 0;
    if (millis() - lastRead >= 500) {
        lastRead = millis();
        float t = readTemp();
        
        // อุณหภูมิผิวหนังคนปกติจะเกิน 32 องศา (แปลว่ามีการเอานิ้วมาแตะ)
        if (t > 32.0 && t <= 45.0) {
            // ไม่ต้องเช็คว่าอุณหภูมินิ่งไหม เพราะตอนแตะแรกๆ อุณหภูมิจะค่อยๆ ไต่ขึ้น
            // แค่เช็คว่า "แตะค้างไว้ไม่ปล่อย" ก็พอนับเวลาต่อได้เลย
            tempStableCount++; 
            lastTemp = t;
            
            // คำนวณเวลานับถอยหลัง 3 วินาที (500ms * 6 รอบ = 3000ms)
            int secLeft = 3 - (tempStableCount / 2);
            if (secLeft < 0) secLeft = 0;
            
            lcdPrintLine(2, "T: " + String(lastTemp, 1) + "C (Wait " + String(secLeft) + "s)");
            sendLiveSensorData(lastTemp, 0, 0, 0, 0, 0);

            // ถ้าแตะค้างไว้ครบกำหนดเวลา (3 วินาที)
            if (tempStableCount >= TEMP_STABLE_REQUIRED) {
                lcdPrintLine(3, "✅ Temp OK!");
                delay(2000); 
                enterStage(STAGE_BP);
            }
        } else {
            // ถ้าเอานิ้วออก (อุณหภูมิตก) ให้รีเซ็ตเวลาใหม่เป็น 0 ทันที! ต้องแตะใหม่ 3 วิ
            tempStableCount = 0; 
            lcdPrintLine(2, "Touch sensor 3 sec...");
        }
    }
}

void handleBPStage() {
    if (doConnectOmron) {
        if (connectToOmronServer()) lcdPrintLine(2, "Connected! Waiting for data...");
        else { lcdPrintLine(2, "Connect fail, retry"); doScanOmron = true; }
        doConnectOmron = false;
    }
    if (doScanOmron && !connectedOmron && !doConnectOmron) {
        lcdPrintLine(2, "Scanning Omron...");
        BLEDevice::getScan()->start(5, false);
        BLEDevice::getScan()->clearResults();
    }
    if (bpDataReady) {
        lcdPrintLine(2, "✅ SYS:" + String(latest_systolic) + " DIA:" + String(latest_diastolic));
        delay(1500); enterStage(STAGE_DONE);
    }
}

// 5. สถานะสิ้นสุดการตรวจ ส่งข้อมูลเข้า Server
void handleDoneStage() {
    static bool dataSent = false;
    static unsigned long doneTimer = 0;

    if (!dataSent) {
        showSummary();
        Serial.println("กำลังส่งข้อมูลไปยัง Database (Node.js)...");

        if (WiFi.status() == WL_CONNECTED && currentPatientId != "") {
            HTTPClient http;
            String url = String("http://") + server_ip + ":" + server_port + "/api/iot/save-data";
            http.begin(url);
            http.addHeader("Content-Type", "application/json");

            DynamicJsonDocument doc(1024);
            doc["patientId"] = currentPatientId;
            doc["temp"]      = lastTemp;
            doc["weight"]    = lastWeight;
            doc["height"]    = lastHeight;
            doc["sys"]       = latest_systolic;
            doc["dia"]       = latest_diastolic;
            doc["bpm"]       = 0; // ปิดปรับปรุง ให้ค่าเป็น 0

            String requestBody;
            serializeJson(doc, requestBody);

            int httpResponseCode = http.POST(requestBody);
            if (httpResponseCode == 201 || httpResponseCode == 200) {
                Serial.println("✅ บันทึกข้อมูลลง Database สำเร็จ จบ 1 รอบ!");
            } else {
                Serial.println("❌ บันทึกข้อมูลล้มเหลว Code: " + String(httpResponseCode));
            }
            http.end();
        } else {
            Serial.println("❌ ไม่สามารถส่งข้อมูลได้ (Wi-Fi หลุด หรือ ไม่มี ID)");
        }
        
        dataSent = true;
        doneTimer = millis();
        Serial.println("รอ 10 วินาที เพื่อล้างคิวและเริ่มรอบใหม่...");
    }

    if (millis() - doneTimer > 10000) {
        dataSent = false;
        currentPatientId = "";
        currentPatientName = "";
        enterStage(STAGE_WAIT_PATIENT); // วนกลับไปรอด่านแรก
    }
}

// ==================== Setup ====================
void setup() {
    Serial.begin(115200);
    analogReadResolution(12);

    // เชื่อมต่อ Wi-Fi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected! IP Address: " + WiFi.localIP().toString());

    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    Wire.begin();
    Wire1.begin(MLX_SDA, MLX_SCL);
    Serial.println("System Starting...");

    if (!mlx.begin(0x5A, &Wire1)) {
        Serial.println("❌ MLX90614 Not Found (จะข้ามการวัดอุณหภูมิไม่ได้หากไม่มีโมดูล)");
    }

    BLEDevice::init("ESP32_HealthMonitor");

    int dev_num = esp_ble_get_bond_device_num();
    if (dev_num > 0) {
        esp_ble_bond_dev_t* dev_list = (esp_ble_bond_dev_t*)malloc(sizeof(esp_ble_bond_dev_t) * dev_num);
        esp_ble_get_bond_device_list(&dev_num, dev_list);
        for (int i = 0; i < dev_num; i++) esp_ble_remove_bond_device(dev_list[i].bd_addr);
        free(dev_list);
        Serial.println(">>> ล้างกุญแจเก่าทิ้งเรียบร้อย");
    }

    BLEDevice::setEncryptionLevel(ESP_BLE_SEC_ENCRYPT);
    BLEDevice::setSecurityCallbacks(new OmronSecurityCallbacks());
    BLESecurity* pSecurity = new BLESecurity();
    pSecurity->setAuthenticationMode(ESP_LE_AUTH_REQ_SC_BOND);
    pSecurity->setCapability(ESP_IO_CAP_NONE);
    pSecurity->setInitEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);
    pSecurity->setRespEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);

    pClientScale = BLEDevice::createClient();
    pClientScale->setClientCallbacks(new ScaleClientCallback());

    pClientOmron = BLEDevice::createClient();
    pClientOmron->setClientCallbacks(new OmronClientCallback());

    BLEScan* pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new UnifiedScanCallback());
    pBLEScan->setInterval(1349);
    pBLEScan->setWindow(449);
    pBLEScan->setActiveScan(true);

    enterStage(STAGE_WAIT_PATIENT);
}

// ==================== Loop ====================
void loop() {
    switch (currentStage) {
        case STAGE_WAIT_PATIENT: handleWaitPatientStage(); break;
        case STAGE_HEIGHT:       handleHeightStage();      break;
        case STAGE_WEIGHT:       handleWeightStage();      break;
        case STAGE_VITALS:       handleVitalsStage();      break;
        case STAGE_BP:           handleBPStage();          break;
        case STAGE_DONE:         handleDoneStage();        break;
    }
    delay(5);
}