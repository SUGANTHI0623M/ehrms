using System.Security.Cryptography;
using System.Text;

namespace EktaHR.DesktopAgent.Encryption;

public class EncryptionLayer
{
    private string? _serverPublicKeyPem;

    public void SetServerPublicKey(string? pem)
    {
        _serverPublicKeyPem = pem;
    }

    public EncryptedPayload EncryptActivity(object activity)
    {
        var json = Newtonsoft.Json.JsonConvert.SerializeObject(activity);
        return Encrypt(json, "activity");
    }

    public EncryptedPayload EncryptScreenshot(string tenantId, string employeeId, string deviceId, DateTime timestamp, byte[] imageBytes)
    {
        var obj = new
        {
            tenantId,
            employeeId,
            deviceId,
            timestamp,
            imageBase64 = Convert.ToBase64String(imageBytes)
        };
        var json = Newtonsoft.Json.JsonConvert.SerializeObject(obj);
        return Encrypt(json, "screenshot");
    }

    private EncryptedPayload Encrypt(string plainText, string type)
    {
        using var aes = Aes.Create();
        aes.KeySize = 256;
        aes.GenerateKey();
        aes.GenerateIV();

        var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        var ivPlusCipher = new byte[aes.IV!.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, ivPlusCipher, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, ivPlusCipher, aes.IV.Length, cipherBytes.Length);

        var encryptedPayload = Convert.ToBase64String(ivPlusCipher);
        byte[] encryptedKey;

        if (!string.IsNullOrEmpty(_serverPublicKeyPem))
        {
            using var rsa = RSA.Create();
            rsa.ImportFromPem(_serverPublicKeyPem);
            encryptedKey = rsa.Encrypt(aes.Key!, RSAEncryptionPadding.Pkcs1);
        }
        else
        {
            encryptedKey = aes.Key!;
        }

        return new EncryptedPayload
        {
            EncryptedKey = Convert.ToBase64String(encryptedKey),
            EncryptedPayloadBase64 = encryptedPayload,
            Type = type
        };
    }
}

public class EncryptedPayload
{
    public string EncryptedKey { get; set; } = string.Empty;
    public string EncryptedPayloadBase64 { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}
