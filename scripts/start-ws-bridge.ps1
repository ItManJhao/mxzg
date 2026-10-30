# 本机 WebSocket 到游戏服 TCP 的原字节桥。
# 浏览器连 ws://127.0.0.1:13111/game ，这里把 WebSocket 二进制帧的载荷原样写入 TCP 127.0.0.1:9902，
# 再把 TCP 上读到的字节包成不掩码的二进制帧送回去。不解析协议号。
# 2026-10-21 倩本机：直连 ws://127.0.0.1:13101/ 能 101，但同一套帧没有回包。TCP 9902 会立刻回 1001。
# 双击 scripts\start-ws-bridge.bat 。停止：关掉本窗口，或双击 scripts\stop-ws-bridge.bat 。
param(
    [int]$ListenPort = 13111,
    [string]$ListenPath = '/game',
    [string]$TcpHost = '127.0.0.1',
    [int]$TcpPort = 9902,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
if (-not $env:TEMP -or $env:TEMP.Trim() -eq '') {
    $env:TEMP = [System.IO.Path]::GetTempPath().TrimEnd('\', '/')
}

function Get-TcpListenerPids([int]$Port) {
    $ids = New-Object System.Collections.Generic.List[int]
    $lines = @()
    try {
        $lines = & netstat.exe -ano -p tcp 2>$null
    } catch {
        return @()
    }
    foreach ($line in $lines) {
        if ($line -notmatch 'LISTENING') { continue }
        if ($line -notmatch (":" + $Port + "\s")) { continue }
        if ($line -match '(\d+)\s*$') {
            $ids.Add([int]$Matches[1])
        }
    }
    return @($ids)
}

function Stop-WsBridge([int]$Port) {
    $ErrorActionPreference = 'Continue'
    $pidFile = Join-Path $env:TEMP 'mxzg-ws-bridge.pid'
    $killed = $false
    if (Test-Path $pidFile) {
        $rawLines = @(Get-Content -Path $pidFile -ErrorAction SilentlyContinue)
        $raw = $rawLines | Select-Object -First 1
        if ($raw -match '^\d+$') {
            $target = [int]$raw
            if ($target -ne $PID -and $target -gt 4) {
                try {
                    Stop-Process -Id $target -Force -ErrorAction Stop
                    $killed = $true
                    Write-Host "[桥] 已结束进程 $target"
                } catch {
                    Write-Host "[桥] 进程 $target 已经不在。"
                }
            }
        }
        if ($rawLines.Count -ge 2 -and $rawLines[1] -match '^\d+$') {
            $Port = [int]$rawLines[1]
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    foreach ($procId in @(Get-TcpListenerPids -Port $Port)) {
        if ($procId -eq $PID -or $procId -le 4) { continue }
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            $killed = $true
            Write-Host "[桥] 已结束占用 $Port 的进程 $procId"
        } catch {}
    }
    if (-not $killed) {
        Write-Host "[桥] $Port 上没有桥进程。"
    } else {
        Write-Host "[桥] 已停。游戏服窗口不用关。"
    }
}

if ($Stop) {
    Stop-WsBridge -Port $ListenPort
    exit 0
}

if ($ListenPath -notmatch '^/') { $ListenPath = '/' + $ListenPath }

$pidFile = Join-Path $env:TEMP 'mxzg-ws-bridge.pid'
Set-Content -Path $pidFile -Value @($PID, $ListenPort) -Encoding ascii

$code = @'
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

public class MxzgBridgeText {
    public string Listening = "";
    public string AcceptFail = "";
    public string HandshakeFail = "";
    public string Joined = "";
    public string BadPath = "";
    public string NotWs = "";
    public string TcpDown = "";
    public string FirstUp = "";
    public string FirstDown = "";
    public string Closed = "";
    public string Unexpected = "";
    public string Stopped = "";
    public string HttpTcpDown = "";
    public string HttpBadPath = "";
    public string HttpNotWs = "";
}

public class MxzgWsBridge {
    const int MaxPayload = 8 * 1024 * 1024;
    const string WsMagic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    static int _stop;
    static TcpListener _listener;
    static MxzgBridgeText Texts;

    public static void RequestStop() {
        Interlocked.Exchange(ref _stop, 1);
        try {
            if (_listener != null) _listener.Stop();
        } catch (Exception) {}
    }

    public static void Run(int listenPort, string path, string tcpHost, int tcpPort, MxzgBridgeText text) {
        Texts = text;
        string sample = AcceptKey("dGhlIHNhbXBsZSBub25jZQ==");
        if (sample != "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=") {
            throw new InvalidOperationException("websocket accept self-check failed");
        }
        Interlocked.Exchange(ref _stop, 0);
        string expect = NormPath(path);
        _listener = new TcpListener(IPAddress.Loopback, listenPort);
        _listener.Start();
        string url = "ws://127.0.0.1:" + listenPort + expect;
        string game = "tcp://" + tcpHost + ":" + tcpPort;
        Console.WriteLine(string.Format(text.Listening, url, game));
        while (Interlocked.CompareExchange(ref _stop, 0, 0) == 0) {
            TcpClient client = null;
            try {
                client = _listener.AcceptTcpClient();
            } catch (Exception ex) {
                if (Interlocked.CompareExchange(ref _stop, 0, 0) != 0) break;
                Console.WriteLine(string.Format(text.AcceptFail, ex.Message));
                continue;
            }
            client.NoDelay = true;
            Thread worker = new Thread(Handle);
            worker.IsBackground = true;
            object[] bag = new object[] { client, expect, tcpHost, tcpPort, url };
            worker.Start(bag);
        }
        try { _listener.Stop(); } catch (Exception) {}
        Console.WriteLine(text.Stopped);
    }

    static void Handle(object state) {
        object[] bag = (object[])state;
        TcpClient browser = (TcpClient)bag[0];
        try {
            HandleCore(browser, (string)bag[1], (string)bag[2], (int)bag[3], (string)bag[4]);
        } catch (Exception ex) {
            LogUnexpected(ex);
            try { browser.Close(); } catch (Exception) {}
        }
    }

    static void HandleCore(TcpClient browser, string expectPath, string tcpHost, int tcpPort, string publicUrl) {
        NetworkStream stream = browser.GetStream();
        stream.ReadTimeout = 5000;
        HttpHead head;
        try {
            head = ReadHttpHead(stream);
        } catch (Exception ex) {
            Console.WriteLine(string.Format(Texts.HandshakeFail, ex.Message));
            try { browser.Close(); } catch (Exception) {}
            return;
        }
        string[] lines = head.Text.Split(new string[] { "\r\n" }, StringSplitOptions.None);
        string request = lines.Length > 0 ? lines[0] : "";
        string[] parts = request.Split(' ');
        string method = parts.Length > 0 ? parts[0] : "";
        string rawPath = parts.Length > 1 ? parts[1] : "/";
        string path = NormPath(rawPath);
        if (method != "GET" || path != expectPath) {
            Console.WriteLine(string.Format(Texts.BadPath, rawPath, publicUrl));
            WriteHttp(stream, 404, "Not Found", Texts.HttpBadPath);
            try { browser.Close(); } catch (Exception) {}
            return;
        }
        string upgrade = Header(head.Text, "Upgrade");
        string connection = Header(head.Text, "Connection");
        string key = Header(head.Text, "Sec-WebSocket-Key");
        string version = Header(head.Text, "Sec-WebSocket-Version");
        if (upgrade.ToLowerInvariant().IndexOf("websocket") < 0 || connection.ToLowerInvariant().IndexOf("upgrade") < 0 || key.Length == 0 || version != "13") {
            Console.WriteLine(Texts.NotWs);
            WriteHttp(stream, 400, "Bad Request", Texts.HttpNotWs);
            try { browser.Close(); } catch (Exception) {}
            return;
        }
        TcpClient game = new TcpClient();
        game.NoDelay = true;
        IAsyncResult ar = game.BeginConnect(tcpHost, tcpPort, null, null);
        if (!ar.AsyncWaitHandle.WaitOne(3000)) {
            Console.WriteLine(string.Format(Texts.TcpDown, tcpHost + ":" + tcpPort));
            WriteHttp(stream, 502, "Bad Gateway", Texts.HttpTcpDown);
            try { game.Close(); } catch (Exception) {}
            try { browser.Close(); } catch (Exception) {}
            return;
        }
        try {
            game.EndConnect(ar);
        } catch (Exception) {
            Console.WriteLine(string.Format(Texts.TcpDown, tcpHost + ":" + tcpPort));
            WriteHttp(stream, 502, "Bad Gateway", Texts.HttpTcpDown);
            try { game.Close(); } catch (Exception) {}
            try { browser.Close(); } catch (Exception) {}
            return;
        }
        WriteSwitching(stream, AcceptKey(key.Trim()));
        stream.ReadTimeout = Timeout.Infinite;
        NetworkStream gameStream = game.GetStream();
        gameStream.ReadTimeout = Timeout.Infinite;
        Session session = new Session();
        session.Browser = browser;
        session.BrowserStream = stream;
        session.Game = game;
        session.GameStream = gameStream;
        session.Pipe = new BytePipe(stream, head.Rest);
        Console.WriteLine(string.Format(Texts.Joined, tcpHost + ":" + tcpPort));
        Thread down = new Thread(PumpGameToBrowser);
        down.IsBackground = true;
        down.Start(session);
        PumpBrowserToGame(session);
        down.Join(2000);
    }

    static void PumpBrowserToGame(object state) {
        Session session = (Session)state;
        try {
            while (Interlocked.CompareExchange(ref session.Closed, 0, 0) == 0) {
                byte[] hdr = session.Pipe.ReadExact(2);
                int opcode = hdr[0] & 0x0f;
                int rsv = hdr[0] & 0x70;
                bool masked = (hdr[1] & 0x80) != 0;
                int len = hdr[1] & 0x7f;
                if (rsv != 0 || !masked) {
                    CloseSession(session);
                    return;
                }
                if (len == 126) {
                    byte[] ext = session.Pipe.ReadExact(2);
                    len = (ext[0] << 8) | ext[1];
                } else if (len == 127) {
                    byte[] wide = session.Pipe.ReadExact(8);
                    long big = 0;
                    for (int i = 0; i < 8; i++) big = (big << 8) + wide[i];
                    if (big < 0 || big > MaxPayload) {
                        CloseSession(session);
                        return;
                    }
                    len = (int)big;
                }
                if (len < 0 || len > MaxPayload) {
                    CloseSession(session);
                    return;
                }
                byte[] mask = session.Pipe.ReadExact(4);
                byte[] payload = len == 0 ? new byte[0] : session.Pipe.ReadExact(len);
                for (int i = 0; i < payload.Length; i++) payload[i] = (byte)(payload[i] ^ mask[i & 3]);
                if (opcode == 0x8) {
                    SendWs(session, 0x8, new byte[0], 0, 0);
                    CloseSession(session);
                    return;
                }
                if (opcode == 0x9) {
                    if (payload.Length <= 125) SendWs(session, 0xA, payload, 0, payload.Length);
                    continue;
                }
                if (opcode == 0xA) continue;
                if (opcode != 0x0 && opcode != 0x1 && opcode != 0x2) {
                    CloseSession(session);
                    return;
                }
                if (payload.Length > 0) {
                    session.GameStream.Write(payload, 0, payload.Length);
                    session.GameStream.Flush();
                    Interlocked.Add(ref session.Up, payload.Length);
                    if (Interlocked.Exchange(ref session.SawUp, 1) == 0) Console.WriteLine(Texts.FirstUp);
                }
            }
        } catch (Exception ex) {
            if (Interlocked.CompareExchange(ref session.Closed, 0, 0) == 0 && !(ex is IOException) && !(ex is SocketException) && !(ex is ObjectDisposedException)) {
                LogUnexpected(ex);
            }
            CloseSession(session);
        }
    }

    static void PumpGameToBrowser(object state) {
        Session session = (Session)state;
        byte[] buf = new byte[16384];
        try {
            while (Interlocked.CompareExchange(ref session.Closed, 0, 0) == 0) {
                int n = session.GameStream.Read(buf, 0, buf.Length);
                if (n <= 0) break;
                SendWs(session, 0x2, buf, 0, n);
                Interlocked.Add(ref session.Down, n);
                if (Interlocked.Exchange(ref session.SawDown, 1) == 0) Console.WriteLine(Texts.FirstDown);
            }
        } catch (Exception ex) {
            if (Interlocked.CompareExchange(ref session.Closed, 0, 0) == 0 && !(ex is IOException) && !(ex is SocketException) && !(ex is ObjectDisposedException)) {
                LogUnexpected(ex);
            }
        }
        CloseSession(session);
    }

    static void SendWs(Session session, int opcode, byte[] payload, int offset, int count) {
        int headerLen = 2;
        if (count >= 126 && count <= 65535) headerLen = 4;
        else if (count > 65535) headerLen = 10;
        byte[] header = new byte[headerLen];
        header[0] = (byte)(0x80 | opcode);
        if (count < 126) {
            header[1] = (byte)count;
        } else if (count <= 65535) {
            header[1] = 126;
            header[2] = (byte)((count >> 8) & 0xff);
            header[3] = (byte)(count & 0xff);
        } else {
            header[1] = 127;
            header[2] = 0;
            header[3] = 0;
            header[4] = 0;
            header[5] = 0;
            header[6] = (byte)((count >> 24) & 0xff);
            header[7] = (byte)((count >> 16) & 0xff);
            header[8] = (byte)((count >> 8) & 0xff);
            header[9] = (byte)(count & 0xff);
        }
        lock (session.SendLock) {
            if (Interlocked.CompareExchange(ref session.Closed, 0, 0) != 0) return;
            session.BrowserStream.Write(header, 0, header.Length);
            if (count > 0) session.BrowserStream.Write(payload, offset, count);
            session.BrowserStream.Flush();
        }
    }

    static void CloseSession(Session session) {
        if (Interlocked.Exchange(ref session.Closed, 1) != 0) return;
        Console.WriteLine(string.Format(Texts.Closed, session.Up, session.Down));
        try { session.Game.Close(); } catch (Exception) {}
        try { session.Browser.Close(); } catch (Exception) {}
    }

    static void LogUnexpected(Exception ex) {
        try {
            if (Texts != null && Texts.Unexpected != null && Texts.Unexpected.Length > 0) {
                Console.WriteLine(string.Format(Texts.Unexpected, ex.GetType().Name + " " + ex.Message));
            }
        } catch (Exception) {}
    }

    static string AcceptKey(string key) {
        using (SHA1 sha = SHA1.Create()) {
            byte[] hash = sha.ComputeHash(Encoding.ASCII.GetBytes(key + WsMagic));
            return Convert.ToBase64String(hash);
        }
    }

    static string NormPath(string raw) {
        if (raw == null || raw.Length == 0) return "/";
        int q = raw.IndexOf('?');
        if (q >= 0) raw = raw.Substring(0, q);
        if (raw.Length > 1 && raw[raw.Length - 1] == '/') raw = raw.Substring(0, raw.Length - 1);
        return raw;
    }

    static string Header(string head, string name) {
        string[] lines = head.Split(new string[] { "\r\n" }, StringSplitOptions.None);
        string prefix = name + ":";
        for (int i = 0; i < lines.Length; i++) {
            if (lines[i].StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) {
                return lines[i].Substring(prefix.Length).Trim();
            }
        }
        return "";
    }

    static HttpHead ReadHttpHead(NetworkStream stream) {
        MemoryStream data = new MemoryStream();
        byte[] tmp = new byte[1024];
        while (data.Length < 16384) {
            int n = stream.Read(tmp, 0, tmp.Length);
            if (n <= 0) break;
            data.Write(tmp, 0, n);
            byte[] all = data.ToArray();
            int idx = FindCrlfCrlf(all, all.Length);
            if (idx >= 0) {
                HttpHead head = new HttpHead();
                head.Text = Encoding.ASCII.GetString(all, 0, idx);
                int rest = all.Length - (idx + 4);
                head.Rest = new byte[rest];
                if (rest > 0) Buffer.BlockCopy(all, idx + 4, head.Rest, 0, rest);
                return head;
            }
        }
        throw new IOException("http header incomplete");
    }

    static int FindCrlfCrlf(byte[] data, int length) {
        for (int i = 0; i + 3 < length; i++) {
            if (data[i] == 13 && data[i + 1] == 10 && data[i + 2] == 13 && data[i + 3] == 10) return i;
        }
        return -1;
    }

    static void WriteHttp(NetworkStream stream, int code, string reason, string body) {
        byte[] bytes = Encoding.UTF8.GetBytes(body == null ? "" : body);
        StringBuilder sb = new StringBuilder();
        sb.Append("HTTP/1.1 ").Append(code).Append(' ').Append(reason).Append("\r\n");
        sb.Append("Content-Type: text/plain; charset=utf-8\r\n");
        sb.Append("Content-Length: ").Append(bytes.Length.ToString()).Append("\r\n");
        sb.Append("Connection: close\r\n\r\n");
        byte[] head = Encoding.ASCII.GetBytes(sb.ToString());
        stream.Write(head, 0, head.Length);
        if (bytes.Length > 0) stream.Write(bytes, 0, bytes.Length);
        stream.Flush();
    }

    static void WriteSwitching(NetworkStream stream, string accept) {
        string head = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n";
        byte[] bytes = Encoding.ASCII.GetBytes(head);
        stream.Write(bytes, 0, bytes.Length);
        stream.Flush();
    }

    class HttpHead {
        public string Text = "";
        public byte[] Rest = new byte[0];
    }

    class Session {
        public TcpClient Browser;
        public NetworkStream BrowserStream;
        public TcpClient Game;
        public NetworkStream GameStream;
        public BytePipe Pipe;
        public readonly object SendLock = new object();
        public int Closed;
        public int Up;
        public int Down;
        public int SawUp;
        public int SawDown;
    }

    class BytePipe {
        readonly NetworkStream _stream;
        byte[] _buf;
        int _offset;
        int _length;

        public BytePipe(NetworkStream stream, byte[] prefetch) {
            _stream = stream;
            if (prefetch != null && prefetch.Length > 0) {
                _buf = prefetch;
                _length = prefetch.Length;
            } else {
                _buf = new byte[0];
            }
        }

        public byte[] ReadExact(int count) {
            byte[] dst = new byte[count];
            int got = 0;
            while (got < count) {
                if (_offset >= _length) {
                    _buf = new byte[4096];
                    _length = _stream.Read(_buf, 0, _buf.Length);
                    _offset = 0;
                    if (_length <= 0) throw new IOException("eof");
                }
                int take = count - got;
                int have = _length - _offset;
                if (take > have) take = have;
                Buffer.BlockCopy(_buf, _offset, dst, got, take);
                _offset += take;
                got += take;
            }
            return dst;
        }
    }
}
'@

try {
    Add-Type -TypeDefinition $code -Language CSharp
} catch {
    if (-not ('MxzgWsBridge' -as [type])) { throw }
}

$text = New-Object MxzgBridgeText
$text.Listening = '[桥] 正在听 {0} ，原字节转到 {1}'
$text.AcceptFail = '[桥] 接受连接失败 {0}'
$text.HandshakeFail = '[桥] 握手失败 {0}'
$text.Joined = '[桥] 浏览器已接上，转到 {0}'
$text.BadPath = '[桥] 拒绝路径 {0} 。请用 {1}'
$text.NotWs = '[桥] 不是 WebSocket 升级，已关掉'
$text.TcpDown = '[桥] 连不上 {0} ，这次没有 101'
$text.FirstUp = '[桥] 已把浏览器的字节转到游戏服'
$text.FirstDown = '[桥] 游戏服已有字节回到浏览器'
$text.Closed = '[桥] 断开 上行 {0} 字节 下行 {1} 字节'
$text.Unexpected = '[桥] {0}'
$text.Stopped = '[桥] 已停止'
$text.HttpTcpDown = 'TCP 9902 连不上'
$text.HttpBadPath = '请用 /game'
$text.HttpNotWs = '需要 WebSocket'

$probe = New-Object System.Net.Sockets.TcpClient
try {
    $iar = $probe.BeginConnect($TcpHost, $TcpPort, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(800)) {
        Write-Host "[桥] 警告：TCP ${TcpHost}:${TcpPort} 现在连不上。请先双击 scripts\start-local-server.bat，看到 9902 在听再刷新预览。"
        $probe.Close()
    } else {
        try {
            $probe.EndConnect($iar)
            Write-Host "[桥] TCP ${TcpHost}:${TcpPort} 可以连接。"
        } catch {
            Write-Host "[桥] 警告：TCP ${TcpHost}:${TcpPort} 现在连不上。请先双击 scripts\start-local-server.bat，看到 9902 在听再刷新预览。"
        }
        $probe.Close()
    }
} catch {
    Write-Host "[桥] 警告：TCP ${TcpHost}:${TcpPort} 现在连不上。请先双击 scripts\start-local-server.bat，看到 9902 在听再刷新预览。"
    try { $probe.Close() } catch {}
}

Write-Host '关闭本窗口即停止桥。也可以双击 scripts\stop-ws-bridge.bat 。'
Write-Host '游戏服自带的 13101 能握手，但不回这套帧。预览不要连 13101。'
Write-Host '预览：http://127.0.0.1:7456/?transport=ws'
Write-Host '登录之前单独的心跳 1004 经常没有回包。点进入游戏应出现 s2c 1001。'

try {
    [MxzgWsBridge]::Run($ListenPort, $ListenPath, $TcpHost, $TcpPort, $text)
} catch {
    Write-Host ('[桥] 启动失败：' + $_.Exception.Message)
    Write-Host '若端口已被占用，先双击 scripts\stop-ws-bridge.bat 。'
    exit 1
} finally {
    if (Test-Path $pidFile) {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}
exit 0
