import { CodeBlock } from "../code-block";

export default function CodeBlockExample() {
  const code = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://widget.conferenceapp.com/widget.js';
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    document.body.appendChild(script);
  })();
</script>`;

  return (
    <div className="p-6">
      <CodeBlock code={code} />
    </div>
  );
}
