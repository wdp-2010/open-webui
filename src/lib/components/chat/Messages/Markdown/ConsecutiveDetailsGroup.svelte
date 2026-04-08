<script lang="ts">
	import { decode } from 'html-entities';
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Sparkles from '$lib/components/icons/Sparkles.svelte';
	import GlobeAlt from '$lib/components/icons/GlobeAlt.svelte';
	import Link from '$lib/components/icons/Link.svelte';
	import Photo from '$lib/components/icons/Photo.svelte';
	import Terminal from '$lib/components/icons/Terminal.svelte';
	import Database from '$lib/components/icons/Database.svelte';
	import Note from '$lib/components/icons/Note.svelte';
	import ChatBubble from '$lib/components/icons/ChatBubble.svelte';
	import ChatBubbles from '$lib/components/icons/ChatBubbles.svelte';
	import BookOpen from '$lib/components/icons/BookOpen.svelte';
	import ClockRotateRight from '$lib/components/icons/ClockRotateRight.svelte';
	import Document from '$lib/components/icons/Document.svelte';
	import FullHeightIframe from '$lib/components/common/FullHeightIframe.svelte';

	import { settings } from '$lib/stores';
	import {
		INLINE_TOOL_CHEVRON_CLASS,
		INLINE_TOOL_ICON_CENTER_OFFSET_CLASS,
		INLINE_TOOL_ROW_CLASS,
		INLINE_TOOL_TITLE_CLASS,
		INLINE_TOOL_TRIGGER_CLASS
	} from '$lib/utils/toolCallInlineStyles';
	import {
		getToolPresentation,
		getToolCombinationSummary,
		type ToolIconKey
	} from '$lib/utils/toolCallPresentation';

	const i18n = getContext<Readable<{ t: (key: string, params?: Record<string, unknown>) => string }>>('i18n');

	export let id = '';
	export let tokens: Array<{
		summary?: string;
		attributes?: {
			type?: string;
			name?: string;
			done?: string;
			duration?: string;
			embeds?: string;
			arguments?: string;
		};
	}> = [];

	export let messageDone = true;
	export let groupClosed = false;

	let open = false;
	let allEmbeds: Array<{ name: string; embed: string; args?: string }> = [];
	type ToolCallStatus = 'success' | 'failed' | 'neutral';
	type SummaryIconEntry = { iconKey: ToolIconKey; status: ToolCallStatus };
	let summaryIconEntries: SummaryIconEntry[] = [];
	const STACK_STEP_PX = 11;

	const FAILURE_TEXT_PATTERN = /error|failed|exception|traceback/i;
	const FAILURE_STATUS_PATTERN = /error|fail|failed|exception/;
	const NO_RESULTS_TEXT_PATTERN = /\b(?:no|0)\s+(?:result|results|match|matches)\b|not\s+found|none\s+found|empty/i;

	function parseJSONString(str: string): unknown {
		try {
			return parseJSONString(JSON.parse(str));
		} catch (_parseError) {
			void _parseError;
			return str;
		}
	}

	function getDecodedResult(token: (typeof tokens)[number]): string {
		const raw = (token?.attributes as { result?: string } | undefined)?.result;
		return decode(raw ?? '');
	}

	function isFailedResult(rawResult: string): boolean {
		if (!rawResult.trim()) {
			return false;
		}

		const parsed = parseJSONString(rawResult);

		if (typeof parsed === 'string') {
			return FAILURE_TEXT_PATTERN.test(parsed);
		}

		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return false;
		}

		const record = parsed as Record<string, unknown>;
		const success = record.success;
		const ok = record.ok;
		const status = String(record.status ?? '').toLowerCase();
		const hasFailureStatus = FAILURE_STATUS_PATTERN.test(status);
		const errorField = record.error;
		const hasErrorField =
			errorField !== undefined &&
			errorField !== null &&
			String(errorField).trim().length > 0;
		const message = String(record.message ?? record.result ?? '').trim();

		return (
			success === false ||
			ok === false ||
			hasFailureStatus ||
			hasErrorField ||
			FAILURE_TEXT_PATTERN.test(message)
		);
	}

	function isEmptyCollection(value: unknown): boolean {
		if (Array.isArray(value)) {
			return value.length === 0;
		}

		if (value && typeof value === 'object') {
			return Object.keys(value as Record<string, unknown>).length === 0;
		}

		return false;
	}

	function isNoResultsResult(rawResult: string): boolean {
		if (!rawResult.trim()) {
			return true;
		}

		const parsed = parseJSONString(rawResult);

		if (typeof parsed === 'string') {
			const text = parsed.trim();
			return text.length === 0 || NO_RESULTS_TEXT_PATTERN.test(text);
		}

		if (Array.isArray(parsed)) {
			return parsed.length === 0;
		}

		if (!parsed || typeof parsed !== 'object') {
			return false;
		}

		const record = parsed as Record<string, unknown>;
		const countValues = [record.total, record.count, record.results_count, record.match_count];
		if (countValues.some((value) => Number(value) === 0)) {
			return true;
		}

		const payloadCandidates = [
			record.results,
			record.items,
			record.matches,
			record.data,
			record.channels,
			record.messages,
			record.chats,
			record.notes,
			record.memories,
			record.files,
			record.result
		];

		if (payloadCandidates.some((value) => isEmptyCollection(value))) {
			return true;
		}

		const message = String(record.message ?? '').trim();
		if (message && NO_RESULTS_TEXT_PATTERN.test(message)) {
			return true;
		}

		return Object.keys(record).length === 0;
	}

	function getToolCallStatus(token: (typeof tokens)[number]): ToolCallStatus {
		const rawResult = getDecodedResult(token);
		const failed = isFailedResult(rawResult);
		if (failed) {
			return 'failed';
		}

		const toolName = String(token?.attributes?.name ?? '').toLowerCase();
		const isDiscoveryTool = /(search|list|query|find)/.test(toolName);
		if (token?.attributes?.done === 'true' && isDiscoveryTool && isNoResultsResult(rawResult)) {
			return 'neutral';
		}

		if (token?.attributes?.done === 'true') {
			return 'success';
		}

		return 'neutral';
	}

	function getStatusClass(status: ToolCallStatus): string {
		if (status === 'failed') {
			return 'text-rose-500 dark:text-rose-400';
		}

		if (status === 'success') {
			return 'text-emerald-500 dark:text-emerald-400';
		}

		return 'text-gray-400 dark:text-gray-500';
	}

	$: toolCallCount = tokens.filter((t) => t?.attributes?.type === 'tool_calls').length;
	$: codeInterpreterCount = tokens.filter((t) => t?.attributes?.type === 'code_interpreter').length;
	$: lastToolCall = [...tokens]
		.reverse()
		.find((t) => t?.attributes?.type === 'tool_calls');
	$: hasPending = !groupClosed && !messageDone && (lastToolCall?.attributes?.done ?? 'false') !== 'true';

	function getSummaryIcon(iconKey: ToolIconKey): typeof GlobeAlt {
		const iconMap: Record<ToolIconKey, typeof GlobeAlt> = {
			globe: GlobeAlt,
			link: Link,
			photo: Photo,
			terminal: Terminal,
			database: Database,
			note: Note,
			chat: ChatBubble,
			channels: ChatBubbles,
			book: BookOpen,
			clock: ClockRotateRight,
			sparkles: Sparkles,
			document: Document
		};

		return iconMap[iconKey] ?? Sparkles;
	}

	function getEmbedSrc(item: unknown): string {
		if (item && typeof item === 'object' && 'embed' in item) {
			return String((item as { embed: unknown }).embed);
		}

		return '';
	}

	// Collect all embeds from tool_calls tokens
	$: allEmbeds = (() => {
		const result: Array<{ name: string; embed: string; args: string }> = [];
		for (const t of tokens) {
			if (t?.attributes?.type !== 'tool_calls') continue;
			const raw = decode(t.attributes?.embeds ?? '');
			try {
				const parsed = parseJSONString(raw);
				if (Array.isArray(parsed) && parsed.length > 0) {
					for (const embed of parsed) {
						result.push({
							name: t.attributes?.name ?? '',
							embed,
							args: decode(t.attributes?.arguments ?? '')
						});
					}
				}
			} catch (_embedParseError) {
				void _embedParseError;
				// Ignore malformed embed payloads in summary rendering.
			}
		}
		return result;
	})();

	$: toolCallNames = tokens
		.filter((t) => t?.attributes?.type === 'tool_calls')
		.map((t) => t?.attributes?.name ?? 'tool');

	$: combinationSummary = getToolCombinationSummary(toolCallNames, hasPending);
	$: firstToolPresentation = getToolPresentation(toolCallNames[0]);
	$: summaryIconEntries = (() => {
		const calls = tokens.filter((t) => t?.attributes?.type === 'tool_calls');

		type IconAggregate = {
			iconKey: ToolIconKey;
			firstIndex: number;
			statusOrder: ToolCallStatus[];
		};

		const aggregateMap = new Map<ToolIconKey, IconAggregate>();

		for (let idx = 0; idx < calls.length; idx += 1) {
			const call = calls[idx];
			const iconKey = getToolPresentation(call?.attributes?.name ?? 'tool').iconKey;
			const status = getToolCallStatus(call);
			const current = aggregateMap.get(iconKey) ?? {
				iconKey,
				firstIndex: idx,
				statusOrder: []
			};

			if (!current.statusOrder.includes(status)) {
				current.statusOrder.push(status);
			}

			aggregateMap.set(iconKey, current);
		}

		const ordered = [...aggregateMap.values()].sort((a, b) => a.firstIndex - b.firstIndex);
		const entries: SummaryIconEntry[] = [];

		for (const item of ordered) {
			// Preserve encounter order for each icon key, e.g. failed -> success -> neutral.
			for (const status of item.statusOrder) {
				entries.push({ iconKey: item.iconKey, status });
			}
		}

		if (entries.length > 0) {
			return entries;
		}

		return [
			{
				iconKey: combinationSummary?.iconKey ?? firstToolPresentation.iconKey,
				status: 'neutral'
			}
		];
	})();

	$: summaryText = (() => {
		const parts = [];

		if (combinationSummary && !combinationSummary.showDetailList) {
			return '';
		}

		if (toolCallCount > 0) {
			// Group by tool name and show counts
			const nameCounts: Record<string, number> = {};
			tokens
				.filter((t) => t?.attributes?.type === 'tool_calls')
				.forEach((t) => {
					const name = t?.attributes?.name ?? 'tool';
					nameCounts[name] = (nameCounts[name] || 0) + 1;
				});

			const toolParts = Object.entries(nameCounts).map(([name, count]) =>
				count > 1 ? `${count} ${name}` : name
			);
			parts.push(...toolParts);
		}

		if (codeInterpreterCount > 0) {
			if (codeInterpreterCount === 1) {
				parts.push($i18n.t('Ran {{COUNT}} analysis', { COUNT: codeInterpreterCount }));
			} else {
				parts.push($i18n.t('Ran {{COUNT}} analyses', { COUNT: codeInterpreterCount }));
			}
		}

		const detail = parts.join(', ');
		return detail;
	})();

	$: prefixText = combinationSummary
		? combinationSummary.prefix
		: hasPending
			? $i18n.t('Exploring')
			: $i18n.t('Explored');
	$: topSummaryIconIndex = Math.max(summaryIconEntries.length - 1, 0);
</script>

<div {id} class="w-full">
	<button
		class={INLINE_TOOL_TRIGGER_CLASS}
		aria-label={$i18n.t('Toggle details')}
		aria-expanded={open}
		on:click={() => {
			open = !open;
		}}
	>
		<div class="{INLINE_TOOL_ROW_CLASS} {hasPending ? 'shimmer' : ''}">
			<!-- Status icon -->
			{#if hasPending}
				<div>
					<Spinner className="size-4" />
				</div>
			{:else if toolCallCount > 0}
				<div class="text-emerald-500 dark:text-emerald-400 size-4 relative overflow-visible shrink-0">
					{#if summaryIconEntries.length > 1}
						{#each summaryIconEntries as entry, idx}
							{@const isTopIcon = idx === topSummaryIconIndex}
							{@const collapseUnderTop = open && !isTopIcon}
							{@const stackOffset = (summaryIconEntries.length - 1 - idx) * STACK_STEP_PX}
							<div
								class="absolute top-0 {isTopIcon ? '' : 'transition-[transform,opacity] duration-600 ease-[cubic-bezier(0.34,1.56,0.64,1)]'} {getStatusClass(entry.status)} {collapseUnderTop ? 'opacity-0 pointer-events-none' : 'opacity-100'}"
								style="right: {stackOffset}px; z-index: {idx + 1}; transition-delay: {!isTopIcon && collapseUnderTop ? Math.abs(idx - topSummaryIconIndex) * 80 : 0}ms; transform-origin: center; transform: {isTopIcon
									? 'none'
									: `translate3d(${collapseUnderTop ? stackOffset : 0}px, 0, 0) scale(${collapseUnderTop ? 0.78 : 1})`};"
							>
								{#if idx > 0}
									<!-- Icon-shape cutout: same glyph, thicker stroke, background color -->
									<svelte:component
										this={getSummaryIcon(entry.iconKey)}
										className="absolute -inset-[2px] size-5 text-white dark:text-gray-900 fill-white dark:fill-gray-900 z-0"
										strokeWidth="3"
									/>
								{/if}
								<svelte:component
									this={getSummaryIcon(entry.iconKey)}
									className="relative z-10 size-4"
									strokeWidth="2"
								/>
							</div>
						{/each}
					{:else}
						<svelte:component
							this={getSummaryIcon(summaryIconEntries[0].iconKey)}
							className="size-4 {getStatusClass(summaryIconEntries[0].status)}"
							strokeWidth="2"
						/>
					{/if}
				</div>
			{:else}
				<div class="text-gray-400 dark:text-gray-500">
					<Sparkles className="size-3.5" />
				</div>
			{/if}

			<!-- Summary text -->
			<div class={INLINE_TOOL_TITLE_CLASS}>
				<span class="{hasPending ? 'shimmer' : ''}"
					>{prefixText}</span
				>
				{#if summaryText}
					<span class="text-gray-400 dark:text-gray-500">{summaryText}</span>
				{/if}
			</div>

			<!-- Chevron -->
			<div class={INLINE_TOOL_CHEVRON_CLASS}>
				{#if open}
					<ChevronUp strokeWidth="3.5" className="size-3.5" />
				{:else}
					<ChevronDown strokeWidth="3.5" className="size-3.5" />
				{/if}
			</div>
		</div>
	</button>

	{#if open}
		<div
			transition:slide={{ duration: 160, easing: quintOut, axis: 'y' }}
			class="{INLINE_TOOL_ICON_CENTER_OFFSET_CLASS} mt-[-6px] h-3 -mb-1px w-px bg-gray-200 dark:bg-gray-800"
		></div>
	{/if}

	{#if open}
		<div transition:slide={{ duration: 300, easing: quintOut, axis: 'y' }}>
			<div class="mb-0.5 space-y-0.5">
				<slot name="content" />
			</div>
		</div>
	{/if}

	{#if allEmbeds.length > 0}
		{#each allEmbeds as embedItem, idx}
			<div id={`${id}-embed-${idx}`}>
				<FullHeightIframe
					src={getEmbedSrc(embedItem)}
					args={embedItem.args}
					allowScripts={true}
					allowForms={$settings?.iframeSandboxAllowForms ?? false}
					allowSameOrigin={$settings?.iframeSandboxAllowSameOrigin ?? false}
					allowPopups={true}
				/>
			</div>
		{/each}
	{/if}
</div>
