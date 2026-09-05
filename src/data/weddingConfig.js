/* ============================================================
   TOÀN BỘ NỘI DUNG WEBSITE NẰM Ở FILE NÀY
   ------------------------------------------------------------
   Muốn đổi tên, ngày cưới, địa điểm, ảnh, số tài khoản...
   thì chỉ cần sửa file này, KHÔNG cần đụng vào file nào khác.

   Quy ước: chỗ nào cần hiển thị 2 thứ tiếng thì viết
       { vi: 'tiếng Việt', ja: '日本語' }
   ============================================================ */

export const weddingConfig = {
  /* ---------- Cô dâu & chú rể ---------- */
  couple: {
    /* TODO: tên bố mẹ hai bên vẫn là placeholder, chờ chủ tiệc cung cấp */
    groom: {
      shortName: { vi: 'Hậu', ja: 'ハウ' },
      fullName: { vi: 'Nguyễn Chung Hậu', ja: 'グエン チュン ハウ' },
      role: { vi: 'Chú rể', ja: '新郎' },
      parents: {
        father: { vi: 'Ông ...', ja: '...' },
        mother: { vi: 'Bà ...', ja: '...' },
      },
      intro: {
        vi: 'Một người thích cà phê sáng, mê chụp ảnh và luôn cười trước khi kịp nói.',
        ja: '朝のコーヒーと写真を撮ることが大好きで、話す前にいつも笑ってしまう人。',
      },
    },
    bride: {
      shortName: { vi: 'Ai', ja: '亜衣' },
      fullName: { vi: 'Torizuka Ai', ja: '鳥塚 亜衣' },
      role: { vi: 'Cô dâu', ja: '新婦' },
      parents: {
        father: { vi: 'Ông ...', ja: '...' },
        mother: { vi: 'Bà ...', ja: '...' },
      },
      intro: {
        vi: 'Yêu hoa tươi, thích những buổi chiều yên tĩnh và những chuyến đi không lên lịch trước.',
        ja: '花と静かな午後、そして予定を決めない旅が好きな人。',
      },
    },
    /* Dấu thăng dùng cho ảnh mạng xã hội */
    hashtag: '#HauAi2027',
  },

  /* ---------- Thời điểm chính, dùng cho đồng hồ đếm ngược ----------
     Định dạng ISO kèm múi giờ Việt Nam (+07:00).
     Đây là giờ của lễ chính (Lễ Thành Hôn).                          */
  /* Lễ cưới tổ chức tại Nhật Bản — múi giờ +09:00.
     Ngày/giờ và địa chỉ dưới đây vẫn là placeholder, cần thay bằng thông tin thật. */
  weddingDate: '2027-04-24T11:00:00+09:00',

  /* ---------- Các sự kiện trong ngày cưới ---------- */
  events: [
    {
      id: 'vu-quy',
      title: { vi: 'Lễ Vu Quy', ja: '花嫁の家での儀式' },
      time: { vi: '08:00 — Thứ Bảy, 24/04/2027', ja: '8:00 — 2027年4月24日（土）' },
      venue: { vi: 'Tư gia nhà gái', ja: '新婦の実家' },
      address: {
        vi: 'Số ..., ... , Tokyo, Nhật Bản',
        ja: '東京都〇〇区〇〇 1-2-3',
      },
      note: {
        vi: 'Kính mời họ hàng và bạn bè thân thiết của nhà gái.',
        ja: '新婦側のご親族と親しいご友人をお招きいたします。',
      },
    },
    {
      id: 'thanh-hon',
      title: { vi: 'Lễ Thành Hôn', ja: '結婚式' },
      time: { vi: '11:00 — Thứ Bảy, 24/04/2027', ja: '11:00 — 2027年4月24日（土）' },
      venue: { vi: 'Nhà thờ ...', ja: '〇〇教会' },
      address: {
        vi: 'Số ..., ... , Tokyo, Nhật Bản',
        ja: '東京都〇〇区〇〇 4-5-6',
      },
      note: {
        vi: 'Xin quý khách có mặt trước 15 phút để ổn định chỗ ngồi.',
        ja: '開式15分前までにお越しくださいますようお願いいたします。',
      },
    },
    {
      id: 'tiec-cuoi',
      title: { vi: 'Tiệc Cưới', ja: '披露宴' },
      time: { vi: '18:00 — Thứ Bảy, 24/04/2027', ja: '18:00 — 2027年4月24日（土）' },
      venue: { vi: 'Trung tâm Hội nghị ...', ja: '〇〇コンベンションセンター' },
      address: {
        vi: 'Số ..., ... , Tokyo, Nhật Bản',
        ja: '東京都〇〇区〇〇 7-8-9',
      },
      note: {
        vi: 'Sảnh Hoa Hồng, tầng 3. Có chỗ đỗ xe miễn phí trong toà nhà.',
        ja: '3階ローズホール。館内に無料駐車場がございます。',
      },
    },
  ],

  /* ---------- Chuyện tình yêu ---------- */
  story: [
    {
      id: 'gap-go',
      date: { vi: 'Tháng 3, 2019', ja: '2019年3月' },
      title: { vi: 'Lần đầu gặp nhau', ja: '初めての出会い' },
      text: {
        vi: 'Một buổi chiều mưa ở quán cà phê nhỏ trên đường Nguyễn Huệ. Chúng tôi ngồi chung bàn vì quán hết chỗ, rồi nói chuyện đến tận lúc quán đóng cửa.',
        ja: 'グエン・フエ通りの小さなカフェ、雨の降る午後でした。満席だったので相席になり、閉店時間まで話し込んでしまいました。',
      },
      image: './images/story-01.jpg',
    },
    {
      id: 'hen-ho',
      date: { vi: 'Tháng 8, 2019', ja: '2019年8月' },
      title: { vi: 'Chuyến đi đầu tiên', ja: '初めての旅行' },
      text: {
        vi: 'Đà Lạt, hai chiếc xe máy và một tấm bản đồ giấy bị ướt. Lạc đường suốt buổi sáng nhưng đó là lần đầu tiên cả hai biết mình muốn đi cùng nhau lâu hơn.',
        ja: 'ダラットへ。バイク2台と、濡れてしまった紙の地図。午前中ずっと道に迷いましたが、この先もずっと一緒に歩きたいと初めて思えた日でした。',
      },
      image: './images/story-03.jpg',
    },
    {
      id: 'cau-hon',
      date: { vi: 'Tháng 12, 2024', ja: '2024年12月' },
      title: { vi: 'Lời cầu hôn', ja: 'プロポーズ' },
      text: {
        vi: 'Vẫn là quán cà phê ngày xưa, vẫn chiếc bàn góc ấy. Anh chỉ hỏi một câu rất ngắn, và em đã gật đầu trước cả khi anh nói hết.',
        ja: 'あの日と同じカフェの、同じ隅の席で。彼はほんの短い一言を口にし、言い終わる前に彼女は頷いていました。',
      },
      image: './images/story-02.jpg',
    },
    {
      id: 'dam-cuoi',
      date: { vi: 'Tháng 4, 2027', ja: '2027年4月' },
      title: { vi: 'Và hôm nay', ja: 'そして今日' },
      text: {
        vi: 'Bảy năm kể từ buổi chiều mưa đó. Chúng tôi rất mong được gặp bạn trong ngày quan trọng nhất của mình.',
        ja: 'あの雨の午後から7年。私たちの一番大切な日に、あなたにお会いできることを楽しみにしています。',
      },
      image: './images/story-04.jpg',
    },
  ],

  /* ---------- Album ảnh ----------
     Thay ảnh thật: bỏ file vào public/images/ rồi sửa đường dẫn ở đây.
     `alt` là mô tả ảnh, giúp người khiếm thị và công cụ tìm kiếm.      */
  gallery: [
    { src: './images/gallery-01.jpg', alt: { vi: 'Cô dâu chú rể hôn nhau trong mưa cánh hoa', ja: '花びらの中でキスをする新郎新婦' } },
    { src: './images/gallery-02.jpg', alt: { vi: 'Cô dâu chú rể bên bờ biển với voan cưới dài', ja: '海辺で長いベールをまとう新郎新婦' } },
    { src: './images/gallery-03.jpg', alt: { vi: 'Ảnh trắng đen cô dâu chú rể dưới tấm voan', ja: 'ベールの下の新郎新婦（モノクロ）' } },
    { src: './images/gallery-04.jpg', alt: { vi: 'Cô dâu chú rể bên chiếc xe van cổ', ja: 'クラシックなワゴン車と新郎新婦' } },
    { src: './images/gallery-05.jpg', alt: { vi: 'Cô dâu chú rể nắm tay đi dưới hàng cọ', ja: 'ヤシの木の下で手をつなぐ新郎新婦' } },
    { src: './images/gallery-06.jpg', alt: { vi: 'Thả bóng bay cùng quan khách', ja: 'ゲストと一緒に風船を飛ばす様子' } },
    { src: './images/gallery-07.jpg', alt: { vi: 'Hai chiếc ghế cưới trang trí hoa bên hồ', ja: '湖のほとりの花で飾られた二脚の椅子' } },
    { src: './images/gallery-08.jpg', alt: { vi: 'Bàn tiệc dài trang trí hoa tươi', ja: '生花で飾られた長いテーブル' } },
  ],

  /* ---------- Ảnh dùng ở các vị trí cố định ---------- */
  images: {
    hero: './images/hero.jpg',
    eventsBackground: './images/events-bg.jpg',
    floral: './images/floral.jpg',
  },

  /* ---------- Bản đồ ----------
     `embedQuery` là địa chỉ dùng để nhúng bản đồ.
     Dùng OpenStreetMap nên KHÔNG cần khoá API và không theo dõi người dùng.  */
  map: {
    venueName: { vi: 'Trung tâm Hội nghị ...', ja: '〇〇コンベンションセンター' },
    address: {
      vi: 'Số ..., ... , Tokyo, Nhật Bản',
      ja: '東京都〇〇区〇〇 7-8-9',
    },
    /* Toạ độ mẫu (trung tâm Tokyo) — thay bằng toạ độ địa điểm thật */
    lat: 35.6595,
    lng: 139.7005,
    /* Bán kính khung nhìn, số càng nhỏ càng phóng to */
    bboxDelta: 0.006,
  },

  /* ---------- Mừng cưới ---------- */
  gift: {
    accounts: [
      {
        id: 'groom',
        owner: { vi: 'Nguyễn Chung Hậu', ja: 'グエン チュン ハウ' },
        side: { vi: 'Chú rể', ja: '新郎' },
        bank: { vi: 'Ngân hàng Vietcombank', ja: 'ベトコムバンク' },
        number: '',
        /* Đặt ảnh mã QR vào public/images/ rồi điền đường dẫn, ví dụ './images/qr-groom.png'.
           Để trống thì website hiện ô chờ ảnh thay vì hiện ảnh vỡ. */
        qr: '',
      },
      {
        id: 'bride',
        owner: { vi: 'Torizuka Ai', ja: '鳥塚 亜衣' },
        side: { vi: 'Cô dâu', ja: '新婦' },
        bank: { vi: 'Ngân hàng Techcombank', ja: 'テクコムバンク' },
        number: '',
        qr: '',
      },
    ],
  },

  /* Địa chỉ trang đang chạy. Dùng để sinh mã QR in lên thiệp. */
  siteUrl: 'https://haupx9.github.io/wedding-hau-ai/',

  /* ---------- Địa chỉ API nhận phản hồi ----------

     Điền vào đây khi máy chủ EC2 đã chạy, ví dụ:
       url: 'https://rsvp.ten-mien-cua-ban.com/api/rsvp'

     BẮT BUỘC phải là https. Trang chạy https nên trình duyệt chặn thẳng
     việc gọi API http, khách sẽ không gửi được gì.

     Để trống thì trang không gọi API nào — phản hồi chỉ nằm trong máy khách. */
  rsvpApi: {
    url: '',
  },

  /* ---------- Nơi nhận phản hồi xác nhận tham dự ----------

     Phản hồi của khách được đẩy sang một Google Form, Google Form đổ vào
     Google Sheet — bảng tính đó chính là danh sách khách của chủ tiệc.

     Cách điền hai ô dưới đây:

     1. `action` — mở Google Form ở chế độ điền thật (đường link /viewform),
        đổi đuôi `/viewform` thành `/formResponse`. Ví dụ:
        https://docs.google.com/forms/d/e/1FAIpQL.../formResponse

     2. `fields` — mã của từng câu hỏi trong form đó. Mở link /viewform,
        bấm chuột phải > Xem nguồn trang, tìm chuỗi `entry.` sẽ thấy các mã
        dạng entry.123456789 theo đúng thứ tự câu hỏi.

     Để trống `action` thì trang vẫn chạy bình thường: phản hồi chỉ lưu
     trong trình duyệt của khách và KHÔNG ai nhận được. */
  rsvpForm: {
    action: '',
    fields: {
      name: '',      // Họ và tên
      phone: '',     // Số điện thoại
      attending: '', // Có tham dự không
      guests: '',    // Số người đi cùng
      side: '',      // Nhà trai / nhà gái
      message: '',   // Lời nhắn
    },
  },

  /* ---------- Thông tin liên hệ hiện ở chân trang ---------- */
  contact: [
    { label: { vi: 'Chú rể', ja: '新郎' }, name: { vi: 'Nguyễn Chung Hậu', ja: 'グエン チュン ハウ' }, phone: '' },
    { label: { vi: 'Cô dâu', ja: '新婦' }, name: { vi: 'Torizuka Ai', ja: '鳥塚 亜衣' }, phone: '' },
  ],
}

/* ============================================================
   CHỮ TRÊN GIAO DIỆN
   Các nhãn, nút bấm, thông báo... Tách riêng khỏi dữ liệu ở trên
   để dễ rà soát xem đã dịch đủ hai thứ tiếng chưa.
   ============================================================ */

export const ui = {
  /* --- Thanh điều hướng --- */
  nav: {
    home: { vi: 'Trang chủ', ja: 'ホーム' },
    story: { vi: 'Chuyện chúng mình', ja: 'ふたりの物語' },
    gallery: { vi: 'Album', ja: 'ギャラリー' },
    events: { vi: 'Sự kiện', ja: '挙式・披露宴' },
    map: { vi: 'Đường đi', ja: 'アクセス' },
    rsvp: { vi: 'Xác nhận', ja: 'ご出欠' },
    gift: { vi: 'Mừng cưới', ja: 'ご祝儀' },
    label: { vi: 'Điều hướng chính', ja: 'メインナビゲーション' },
    openMenu: { vi: 'Mở menu', ja: 'メニューを開く' },
    closeMenu: { vi: 'Đóng menu', ja: 'メニューを閉じる' },
  },

  /* --- Phần mở đầu --- */
  hero: {
    eyebrow: { vi: 'Save the date', ja: 'Save the date' },
    weAreGettingMarried: { vi: 'Chúng mình cưới', ja: '結婚いたします' },
    dateLine: { vi: 'Thứ Bảy, ngày 24 tháng 4 năm 2027', ja: '2027年4月24日（土）' },
    scroll: { vi: 'Cuộn xuống', ja: 'スクロール' },
  },

  /* --- Đếm ngược --- */
  countdown: {
    eyebrow: { vi: 'Còn bao lâu nữa', ja: 'あと少し' },
    title: { vi: 'Đếm ngược', ja: 'カウントダウン' },
    lead: {
      vi: 'Từng ngày trôi qua đều đưa chúng mình đến gần khoảnh khắc ấy hơn.',
      ja: '一日ずつ、その日が近づいています。',
    },
    days: { vi: 'Ngày', ja: '日' },
    hours: { vi: 'Giờ', ja: '時間' },
    minutes: { vi: 'Phút', ja: '分' },
    seconds: { vi: 'Giây', ja: '秒' },
    finished: {
      vi: 'Hôm nay chính là ngày chúng mình chờ đợi!',
      ja: '今日、待ちに待った日を迎えました！',
    },
  },

  /* --- Giới thiệu cô dâu chú rể --- */
  couple: {
    eyebrow: { vi: 'Cô dâu & Chú rể', ja: '新郎新婦' },
    title: { vi: 'Hân hạnh giới thiệu', ja: 'ふたりについて' },
    sonOf: { vi: 'Con trai của', ja: '長男' },
    daughterOf: { vi: 'Con gái của', ja: '長女' },
    and: { vi: 'và', ja: '・' },
  },

  /* --- Chuyện tình yêu --- */
  story: {
    eyebrow: { vi: 'Chuyện chúng mình', ja: 'ふたりの物語' },
    title: { vi: 'Câu chuyện tình yêu', ja: 'これまでの歩み' },
    lead: {
      vi: 'Bảy năm, vài nghìn tách cà phê và một lời hứa.',
      ja: '7年間、数えきれないほどのコーヒー、そしてひとつの約束。',
    },
  },

  /* --- Album --- */
  gallery: {
    eyebrow: { vi: 'Khoảnh khắc', ja: '思い出' },
    title: { vi: 'Album ảnh cưới', ja: 'ギャラリー' },
    lead: {
      vi: 'Bấm vào ảnh để xem ở kích thước lớn.',
      ja: '写真をクリックすると拡大表示されます。',
    },
    open: { vi: 'Xem ảnh lớn', ja: '拡大して見る' },
    close: { vi: 'Đóng', ja: '閉じる' },
    prev: { vi: 'Ảnh trước', ja: '前の写真' },
    next: { vi: 'Ảnh sau', ja: '次の写真' },
    counter: { vi: 'Ảnh', ja: '枚目' },
  },

  /* --- Sự kiện --- */
  events: {
    eyebrow: { vi: 'Trân trọng kính mời', ja: 'ご案内' },
    title: { vi: 'Sự kiện cưới', ja: '挙式・披露宴' },
    lead: {
      vi: 'Sự hiện diện của bạn là niềm vinh hạnh lớn nhất của gia đình chúng tôi.',
      ja: 'ご列席いただけますことを心よりお待ち申し上げております。',
    },
    /* Nhãn đọc cho trình đọc màn hình, đứng cạnh các icon nhỏ trong thẻ sự kiện */
    timeLabel: { vi: 'Thời gian', ja: '日時' },
    venueLabel: { vi: 'Địa điểm', ja: '会場' },
    noteLabel: { vi: 'Ghi chú', ja: '備考' },
  },

  /* --- Bản đồ --- */
  map: {
    eyebrow: { vi: 'Đường đi', ja: 'アクセス' },
    title: { vi: 'Địa điểm tổ chức', ja: '会場のご案内' },
    lead: {
      vi: 'Tiệc cưới được tổ chức tại đây. Bấm nút chỉ đường để mở bản đồ trên điện thoại của bạn.',
      ja: '披露宴会場はこちらです。「経路を調べる」から地図アプリを開けます。',
    },
    directions: { vi: 'Chỉ đường', ja: '経路を調べる' },
    mapTitle: { vi: 'Bản đồ địa điểm tổ chức tiệc cưới', ja: '披露宴会場の地図' },
  },

  /* --- Xác nhận tham dự --- */
  rsvp: {
    eyebrow: { vi: 'Xác nhận tham dự', ja: 'ご出欠のお返事' },
    title: { vi: 'Bạn sẽ đến chứ?', ja: 'ご出席いただけますか' },
    lead: {
      vi: 'Vui lòng phản hồi trước ngày 10/04/2027 để chúng mình chuẩn bị chu đáo nhất.',
      ja: '準備の都合上、2027年4月10日までにお返事をいただけますと幸いです。',
    },
    name: { vi: 'Họ và tên', ja: 'お名前' },
    namePlaceholder: { vi: 'Nguyễn Văn A', ja: '山田 太郎' },
    phone: { vi: 'Số điện thoại', ja: '電話番号' },
    phonePlaceholder: { vi: '09xx xxx xxx', ja: '090-1234-5678' },
    attending: { vi: 'Bạn có tham dự không?', ja: 'ご出欠' },
    yes: { vi: 'Mình sẽ đến', ja: '出席します' },
    no: { vi: 'Rất tiếc, mình bận mất rồi', ja: '欠席します' },
    guests: { vi: 'Số người tham dự', ja: 'ご出席人数' },
    side: { vi: 'Bạn là khách của', ja: 'どちらのご関係ですか' },
    sideGroom: { vi: 'Nhà trai', ja: '新郎側' },
    sideBride: { vi: 'Nhà gái', ja: '新婦側' },
    message: { vi: 'Lời chúc gửi cô dâu chú rể', ja: 'お祝いのメッセージ' },
    messagePlaceholder: {
      vi: 'Chúc hai bạn trăm năm hạnh phúc...',
      ja: 'ご結婚おめでとうございます...',
    },
    submit: { vi: 'Gửi xác nhận', ja: '送信する' },
    submitting: { vi: 'Đang gửi...', ja: '送信中...' },
    successTitle: { vi: 'Cảm ơn bạn rất nhiều!', ja: 'ありがとうございます！' },
    successYes: {
      vi: 'Chúng mình đã nhận được xác nhận và rất mong gặp bạn trong ngày cưới.',
      ja: 'お返事を承りました。当日お会いできることを楽しみにしております。',
    },
    successNo: {
      vi: 'Chúng mình đã nhận được phản hồi. Dù không gặp được, chúng mình vẫn rất trân trọng tình cảm của bạn.',
      ja: 'お返事を承りました。お会いできないのは残念ですが、お心遣いに感謝いたします。',
    },
    sendAnother: { vi: 'Gửi phản hồi khác', ja: '別の回答を送る' },
    errorName: { vi: 'Vui lòng nhập họ tên của bạn.', ja: 'お名前をご入力ください。' },
    errorPhone: {
      vi: 'Số điện thoại chưa hợp lệ (cần ít nhất 9 chữ số).',
      ja: '電話番号の形式が正しくありません（9桁以上）。',
    },
    optional: { vi: 'không bắt buộc', ja: '任意' },
    required: { vi: 'bắt buộc', ja: '必須' },
    /* Hiện khi đã nối với Google Form — phản hồi thật sự gửi về chủ tiệc */
    savedNotice: {
      vi: 'Thông tin của bạn chỉ được dùng để chúng mình chuẩn bị cho ngày cưới.',
      ja: 'いただいた情報は、結婚式の準備のためだけに使用いたします。',
    },
    sendError: {
      vi: 'Rất tiếc, chưa gửi được phản hồi của bạn. Bạn thử lại giúp mình nhé, hoặc nhắn trực tiếp cho cô dâu chú rể.',
      ja: '申し訳ございません、お返事を送信できませんでした。もう一度お試しいただくか、新郎新婦へ直接ご連絡ください。',
    },
    /* Hiện khi weddingConfig.rsvpForm.action còn trống — chưa gửi đi đâu cả */
    demoNotice: {
      vi: 'Bản demo này lưu phản hồi ngay trên trình duyệt của bạn, chưa gửi đi đâu cả.',
      ja: 'このデモ版では、回答はお使いのブラウザ内にのみ保存されます。',
    },
  },

  /* --- Mừng cưới --- */
  gift: {
    eyebrow: { vi: 'Hộp mừng cưới', ja: 'ご祝儀' },
    title: { vi: 'Gửi lời chúc phúc', ja: 'お祝いのお気持ち' },
    lead: {
      vi: 'Được đón tiếp bạn đã là món quà quý nhất. Nếu bạn ở xa và muốn gửi lời chúc, đây là thông tin của chúng mình.',
      ja: 'ご列席いただけることが何よりの贈り物です。遠方の方でお心遣いをお考えの方は、こちらをご利用ください。',
    },
    copy: { vi: 'Sao chép số tài khoản', ja: '口座番号をコピー' },
    copied: { vi: 'Đã sao chép!', ja: 'コピーしました！' },
    qrPending: { vi: 'Mã QR sẽ được cập nhật', ja: 'QRコードは後日掲載します' },
    accountNumber: { vi: 'Số tài khoản', ja: '口座番号' },
    ownerLabel: { vi: 'Chủ tài khoản', ja: '口座名義' },
    bankLabel: { vi: 'Ngân hàng', ja: '銀行' },
    qrAlt: { vi: 'Mã QR chuyển khoản', ja: '送金用QRコード' },
    pending: { vi: 'Đang cập nhật', ja: '準備中' },
  },

  /* --- Mã QR in lên thiệp giấy --- */
  qr: {
    title: { vi: 'Mã QR xác nhận tham dự', ja: 'ご出欠確認用QRコード' },
    hint: {
      vi: 'Quét mã để xác nhận tham dự. Bạn cũng có thể tải mã về để in lên thiệp cưới giấy.',
      ja: 'QRコードを読み取ると、ご出欠のお返事ページが開きます。紙の招待状に印刷する場合は、下記からダウンロードしてください。',
    },
    downloadSvg: { vi: 'Tải SVG', ja: 'SVGをダウンロード' },
    downloadPng: { vi: 'Tải PNG', ja: 'PNGをダウンロード' },
    error: {
      vi: 'Rất tiếc, chưa tạo được mã QR trên trình duyệt này. Bạn vui lòng dùng đường dẫn bên dưới nhé.',
      ja: 'お使いのブラウザではQRコードを生成できませんでした。お手数ですが、下記のリンクをご利用ください。',
    },
  },

  /* --- Chân trang --- */
  footer: {
    thanks: { vi: 'Cảm ơn bạn đã ghé thăm', ja: 'ご覧いただきありがとうございます' },
    contactTitle: { vi: 'Liên hệ', ja: 'お問い合わせ' },
    madeWith: { vi: 'Thiệp cưới trực tuyến', ja: 'オンライン結婚式招待状' },
    backToTop: { vi: 'Về đầu trang', ja: 'ページ上部へ戻る' },
  },

  /* --- Nút đổi ngôn ngữ --- */
  language: {
    label: { vi: 'Ngôn ngữ', ja: '言語' },
    vi: { vi: 'Tiếng Việt', ja: 'ベトナム語' },
    ja: { vi: 'Tiếng Nhật', ja: '日本語' },
    switchTo: { vi: 'Chuyển sang tiếng Nhật', ja: 'ベトナム語に切り替える' },
    /* Nhãn ngắn hiện trên nút bấm. Giữ nguyên ở cả hai thứ tiếng
       để khách nào cũng nhận ra ngôn ngữ của mình. */
    viShort: { vi: 'VI', ja: 'VI' },
    jaShort: { vi: '日本語', ja: '日本語' },
  },
}
