export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: "0 24px" }}>
      <h1>JPT Media Bot 🤖</h1>
      <p style={{ color: "#555", fontSize: 18 }}>
        AI-powered image &amp; video generation + social media posting — all from Slack.
      </p>

      <h2>How to use</h2>
      <ol>
        <li>
          Invite <strong>@JPT</strong> to any Slack channel.
        </li>
        <li>
          Tag the bot with a generation command:
          <ul>
            <li>
              <code>@JPT generate image of a sunset over the Himalayas</code>
            </li>
            <li>
              <code>@JPT generate video of a futuristic city at night</code>
            </li>
          </ul>
        </li>
        <li>
          JPT generates the media using PixelBin AI and posts it back in the channel.
        </li>
        <li>
          Select one or more social platforms, add an optional caption, and hit{" "}
          <strong>Post</strong>.
        </li>
      </ol>

      <h2>API Endpoints</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "8px 12px" }}>Route</th>
            <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "8px 12px" }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["POST /api/slack/events", "Slack Events API webhook (app_mention)"],
            ["POST /api/slack/interactions", "Slack Block Kit button / modal interactions"],
            ["POST /api/pixelbin/webhook", "PixelBin generation job completion callback"],
            ["POST /api/social/post", "Post media to selected social platforms"],
          ].map(([route, desc]) => (
            <tr key={route}>
              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee" }}>
                <code>{route}</code>
              </td>
              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
